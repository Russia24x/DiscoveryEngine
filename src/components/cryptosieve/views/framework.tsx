"use client";

import { useI18n } from "@/i18n/provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Lock, Shield } from "lucide-react";

export function FrameworkView() {
  const { t } = useI18n();
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            {t.nav.framework}
          </h1>
          <p className="text-xs text-muted-foreground">CryptoSieve Investment Decision Engine — locked architecture reference</p>
        </div>
        <Badge variant="outline" className="gap-1.5 text-pass border-pass/30">
          <Lock className="h-3 w-3" /> v1.0 LOCKED
        </Badge>
      </div>

      {/* Pipeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin pb-2 text-xs font-mono">
            {["Gate", "PQ", "TQ", "VA", "V", "R", "IA_raw", "C", "IA_eff", "M", "IA_final"].map((step, i, arr) => (
              <div key={step} className="flex items-center gap-1 whitespace-nowrap">
                <span className={cnStep(step)}>{step}</span>
                {i < arr.length - 1 && <span className="text-muted-foreground rtl:rotate-180">→</span>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Formulas */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Core formulas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Formula label={t.formula.iaRaw} />
            <Formula label={t.formula.iaEff} />
            <Formula label={t.formula.iaFinal} />
            <Formula label={t.formula.vae} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Component weights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs font-mono">
            <WeightRow name="PQ" formula="0.30·RG + 0.25·RS + 0.20·RD + 0.15·MP + 0.10·UG" />
            <WeightRow name="TQ" formula="0.30·VAE + 0.20·SAR + 0.20·(1−FDR) + 0.20·TU + 0.10·GQ" />
            <WeightRow name="VA" formula="0.30·α + 0.30·δ + 0.25·τ + 0.15·BA" />
            <WeightRow name="V" formula="0.25·(1−MC/TC) + 0.25·(1−MC/PR) + 0.20·TY + 0.15·(1−FDV/TC) + 0.15·IG" />
            <WeightRow name="R" formula="0.25·RC + 0.20·IC + 0.20·REG + 0.15·SC + 0.10·ML + 0.10·DR" />
          </CardContent>
        </Card>
      </div>

      {/* Four ranks */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Four-rank system</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {[
              ["Fundamental Rank", "IA_raw", "Intrinsic asset quality"],
              ["Confidence Rank", "C", "Data quality"],
              ["Effective Rank", "IA_effective", "Quality + certainty"],
              ["Market Rank", "IA_final", "Actionable with regime"],
            ].map(([n, b, d]) => (
              <div key={n} className="rounded-lg border border-border bg-card/50 p-3">
                <div className="text-xs font-semibold">{n}</div>
                <div className="font-mono text-[11px] text-primary mt-0.5">{b}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{d}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gates */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Gates (mechanism-aware)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-2 text-xs">
          <GateLine rule="VAE < 10" desc={t.gates.vaeDesc} cond={false} />
          <GateLine rule="δ < 5" desc={t.gates.deltaDesc} cond={false} />
          <GateLine rule="R > 90" desc={t.gates.riskDesc} cond={false} />
          <GateLine rule="SAR < 0.1" desc={t.gates.sarDesc} cond={true} />
        </CardContent>
      </Card>

      {/* Reference */}
      <Card>
        <CardContent className="p-4 text-xs text-muted-foreground leading-relaxed">
          <p className="flex items-start gap-2">
            <Lock className="h-4 w-4 text-pass shrink-0 mt-0.5" />
            <span>
              This framework is <strong className="text-foreground">LOCKED (v1.0)</strong>. Any change requires a PR + version bump per{" "}
              <code className="font-mono text-primary">RULES.md §4</code>. See{" "}
              <a href="/FRAMEWORK.md" target="_blank" rel="noreferrer" className="underline hover:text-foreground">FRAMEWORK.md</a> for the full document.
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function cnStep(step: string) {
  if (step === "IA_final") return "px-2 py-1 rounded bg-primary/15 text-primary font-semibold";
  if (step === "Gate") return "px-2 py-1 rounded bg-muted text-foreground font-semibold";
  if (["C", "M"].includes(step)) return "px-2 py-1 rounded bg-investigate/15 text-investigate";
  return "px-2 py-1 rounded bg-muted/50 text-foreground";
}

function Formula({ label }: { label: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2.5 font-mono text-[11px] leading-relaxed break-words">
      {label}
    </div>
  );
}

function WeightRow({ name, formula }: { name: string; formula: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-primary font-semibold">{name}</span>
      <span className="text-muted-foreground text-[10px] leading-tight">{formula}</span>
    </div>
  );
}

function GateLine({ rule, desc, cond }: { rule: string; desc: string; cond: boolean }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border p-2.5">
      <span className="font-mono font-semibold text-xs whitespace-nowrap">{rule}</span>
      <span className="text-[10px] text-muted-foreground flex-1">{desc}</span>
      {cond && (
        <span className="text-[9px] uppercase tracking-wider text-investigate shrink-0">cond</span>
      )}
    </div>
  );
}
