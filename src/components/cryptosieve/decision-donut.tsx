"use client";

import { cn } from "@/lib/utils";

// Donut chart for decision distribution (PASS / INVESTIGATE / REJECT).
export function DecisionDonut({
  pass,
  investigate,
  reject,
  size = 120,
}: {
  pass: number;
  investigate: number;
  reject: number;
  size?: number;
}) {
  const total = pass + investigate + reject || 1;
  const passPct = (pass / total) * 100;
  const invPct = (investigate / total) * 100;
  const rejPct = (reject / total) * 100;

  const stroke = size * 0.12;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;

  // Arc segments: pass (green), investigate (amber), reject (red)
  const passArc = (passPct / 100) * circ;
  const invArc = (invPct / 100) * circ;
  const rejArc = (rejPct / 100) * circ;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} opacity={0.2} />
        {/* Reject (red) — first segment */}
        {rejArc > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="var(--reject)"
            strokeWidth={stroke}
            strokeDasharray={`${rejArc} ${circ - rejArc}`}
            strokeDashoffset={0}
          />
        )}
        {/* Investigate (amber) — second segment */}
        {invArc > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="var(--investigate)"
            strokeWidth={stroke}
            strokeDasharray={`${invArc} ${circ - invArc}`}
            strokeDashoffset={-rejArc}
          />
        )}
        {/* Pass (green) — third segment */}
        {passArc > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="var(--pass)"
            strokeWidth={stroke}
            strokeDasharray={`${passArc} ${circ - passArc}`}
            strokeDashoffset={-(rejArc + invArc)}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-lg font-bold num">{total}</span>
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">total</span>
      </div>
    </div>
  );
}

// Compact legend for the donut.
export function DecisionLegend({
  pass,
  investigate,
  reject,
}: {
  pass: number;
  investigate: number;
  reject: number;
}) {
  const total = pass + investigate + reject || 1;
  return (
    <div className="space-y-1.5">
      <LegendItem color="bg-pass" label="Pass" count={pass} pct={(pass / total) * 100} />
      <LegendItem color="bg-investigate" label="Investigate" count={investigate} pct={(investigate / total) * 100} />
      <LegendItem color="bg-reject" label="Reject" count={reject} pct={(reject / total) * 100} />
    </div>
  );
}

function LegendItem({ color, label, count, pct }: { color: string; label: string; count: number; pct: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={cn("h-2.5 w-2.5 rounded-sm", color)} />
      <span className="text-muted-foreground flex-1">{label}</span>
      <span className="font-mono num font-semibold">{count}</span>
      <span className="font-mono num text-muted-foreground text-[10px] w-10 text-end">{pct.toFixed(0)}%</span>
    </div>
  );
}
