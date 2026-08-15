"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";

interface Series {
  key: string;
  label: string;
  data: number[];
  labels: string[];
}

export function HistoricalTrendChart({ series }: { series: Series[] }) {
  const { t } = useI18n();
  const [selected, setSelected] = useState(series[0]?.key ?? "iaFinal");
  const [showAll, setShowAll] = useState(false);

  const active = series.find((s) => s.key === selected) ?? series[0];
  if (!active) return null;

  const chartData = active.labels.map((label, i) => ({
    label,
    value: active.data[i] ?? 0,
  }));

  const visibleSeries = showAll ? series.filter((s) => ["iaRaw", "iaEffective", "iaFinal"].includes(s.key)) : [active];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            {t.historical.title}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Single" : "Compare IA series"}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">{t.historical.subtitle}</p>
      </CardHeader>
      <CardContent>
        {/* Metric selector chips */}
        {!showAll && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {series.map((s) => (
              <button
                key={s.key}
                onClick={() => setSelected(s.key)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
                  selected === s.key
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {showAll ? (
              <LineChart data={active.labels.map((label, i) => {
                const row: any = { label };
                for (const s of visibleSeries) row[s.key] = s.data[i] ?? 0;
                return row;
              })}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} width={28} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "11px",
                  }}
                />
                {visibleSeries.map((s, i) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={LINE_COLORS[i % LINE_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3, fill: LINE_COLORS[i % LINE_COLORS.length] }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            ) : (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} width={28} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "11px",
                  }}
                  formatter={(v: any) => [Number(v).toFixed(1), active.label]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorVal)"
                  dot={{ r: 3, fill: "var(--primary)" }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Delta indicator */}
        {!showAll && active.data.length >= 2 && (
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-muted-foreground">
              {active.labels[0]} → {active.labels[active.labels.length - 1]}
            </span>
            <DeltaIndicator from={active.data[0]} to={active.data[active.data.length - 1]} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const LINE_COLORS = ["var(--primary)", "var(--investigate)", "var(--pass)", "var(--chart-4)", "var(--chart-5)"];

function DeltaIndicator({ from, to }: { from: number; to: number }) {
  const delta = to - from;
  const pct = from > 0 ? (delta / from) * 100 : 0;
  const positive = delta >= 0;
  return (
    <span
      className={cn(
        "font-mono font-semibold num px-1.5 py-0.5 rounded text-[11px]",
        positive ? "text-pass bg-pass/10" : "text-reject bg-reject/10"
      )}
    >
      {positive ? "+" : ""}
      {delta.toFixed(1)} ({positive ? "+" : ""}
      {pct.toFixed(0)}%)
    </span>
  );
}
