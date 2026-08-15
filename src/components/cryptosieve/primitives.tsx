"use client";

import { cn } from "@/lib/utils";
import { fmtScore } from "@/lib/format";
import type { Decision, GateResult } from "@/lib/engine/types";

// ── Score gauge: radial ring + numeric ───────────────────────────────────────
export function ScoreGauge({
  value,
  label,
  max = 100,
  size = "md",
  tone = "auto",
}: {
  value?: number | null;
  label?: string;
  max?: number;
  size?: "sm" | "md" | "lg";
  tone?: "auto" | "good" | "warn" | "bad";
}) {
  const v = value ?? 0;
  const pct = Math.max(0, Math.min(1, v / max));
  const dim = size === "lg" ? 120 : size === "sm" ? 56 : 84;
  const stroke = size === "lg" ? 10 : size === "sm" ? 5 : 7;
  const r = (dim - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  const autoTone =
    pct >= 0.66 ? "good" : pct >= 0.4 ? "warn" : "bad";
  const t = tone === "auto" ? autoTone : tone;
  const color =
    t === "good"
      ? "var(--pass)"
      : t === "warn"
      ? "var(--investigate)"
      : "var(--reject)";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} className="-rotate-90">
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={r}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={stroke}
            opacity={0.25}
          />
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "font-mono font-semibold num",
              size === "lg" ? "text-2xl" : size === "sm" ? "text-xs" : "text-base"
            )}
          >
            {fmtScore(v, 0)}
          </span>
        </div>
      </div>
      {label && (
        <span className="text-xs text-muted-foreground text-center leading-tight max-w-[8rem]">
          {label}
        </span>
      )}
    </div>
  );
}

// ── Horizontal metric bar ────────────────────────────────────────────────────
export function MetricBar({
  value,
  label,
  sublabel,
  tone = "auto",
  showValue = true,
}: {
  value?: number | null;
  label?: string;
  sublabel?: string;
  tone?: "auto" | "good" | "warn" | "bad" | "neutral";
  showValue?: boolean;
}) {
  const v = value ?? 0;
  const pct = Math.max(0, Math.min(100, v));
  const autoTone = pct >= 66 ? "good" : pct >= 40 ? "warn" : "bad";
  const t = tone === "auto" ? autoTone : tone;
  const color =
    t === "good"
      ? "var(--pass)"
      : t === "warn"
      ? "var(--investigate)"
      : t === "bad"
      ? "var(--reject)"
      : t === "neutral"
      ? "var(--muted-foreground)"
      : "var(--primary)";
  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex items-baseline justify-between mb-1.5">
          {label && <span className="text-xs text-muted-foreground">{label}</span>}
          {showValue && (
            <span className="text-xs font-mono font-medium num">{fmtScore(v, 0)}</span>
          )}
        </div>
      )}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {sublabel && <p className="text-[10px] text-muted-foreground mt-1">{sublabel}</p>}
    </div>
  );
}

// ── Decision badge ───────────────────────────────────────────────────────────
export function DecisionBadge({ decision, size = "md" }: { decision: Decision; size?: "sm" | "md" }) {
  const map: Record<Decision, { label: string; cls: string }> = {
    PASS: {
      label: "PASS",
      cls: "bg-pass/15 text-pass border-pass/30",
    },
    INVESTIGATE: {
      label: "INVESTIGATE",
      cls: "bg-investigate/15 text-investigate border-investigate/30",
    },
    REJECT: {
      label: "REJECT",
      cls: "bg-reject/15 text-reject border-reject/30",
    },
  };
  const m = map[decision];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-wide",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
        m.cls
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-soft" />
      {m.label}
    </span>
  );
}

// ── Rank badge ───────────────────────────────────────────────────────────────
export function RankBadge({ rank, total }: { rank?: number | null; total?: number }) {
  if (rank == null) return <span className="text-muted-foreground text-xs">—</span>;
  const tone = rank <= 3 ? "good" : rank <= 10 ? "neutral" : "muted";
  const cls =
    tone === "good"
      ? "text-pass"
      : tone === "neutral"
      ? "text-foreground"
      : "text-muted-foreground";
  return (
    <span className={cn("font-mono text-xs font-semibold num", cls)}>
      #{rank}
      {total ? <span className="text-muted-foreground/60">/{total}</span> : null}
    </span>
  );
}

// ── Gate pill ────────────────────────────────────────────────────────────────
export function GatePill({ gate }: { gate: GateResult }) {
  const passed = gate.passed;
  const conditional = gate.conditional;
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg border px-3 py-2",
        passed
          ? "border-pass/25 bg-pass/5"
          : conditional
          ? "border-investigate/25 bg-investigate/5"
          : "border-reject/25 bg-reject/5"
      )}
    >
      <div className="flex flex-col">
        <span className="font-mono text-xs font-semibold num">{gate.label}</span>
        <span className="text-[10px] text-muted-foreground">{gate.description}</span>
      </div>
      <div className="flex items-center gap-2">
        {conditional && (
          <span className="text-[9px] uppercase tracking-wider text-investigate">cond</span>
        )}
        <span
          className={cn(
            "text-xs font-bold",
            passed ? "text-pass" : conditional ? "text-investigate" : "text-reject"
          )}
        >
          {passed ? "✓" : "✕"}
        </span>
      </div>
    </div>
  );
}

// ── Tiny sparkline ───────────────────────────────────────────────────────────
export function Sparkline({
  data,
  width = 120,
  height = 32,
  tone = "primary",
}: {
  data: number[];
  width?: number;
  height?: number;
  tone?: "primary" | "good" | "bad";
}) {
  if (!data || data.length < 2) return <div style={{ width, height }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const color =
    tone === "good" ? "var(--pass)" : tone === "bad" ? "var(--reject)" : "var(--primary)";
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
    </svg>
  );
}
