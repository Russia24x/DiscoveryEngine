"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { CandlestickChart, TrendingUp, TrendingDown, Activity, BarChart3 } from "lucide-react";
import type { PriceSeries } from "@/lib/engine/price-chart";
import { fmtUsd, fmtPct } from "@/lib/format";

export function PriceChartView({ series }: { series: PriceSeries }) {
  const { t } = useI18n();
  const [view, setView] = useState<"price" | "volume" | "rsi">("price");
  const [showMA, setShowMA] = useState(true);

  const chartData = series.points.map((p) => ({
    t: p.t,
    date: new Date(p.date).toLocaleDateString("en", { month: "short", day: "numeric" }),
    price: p.price,
    volume: p.volume,
    rsi: p.rsi,
    ma7: p.ma7,
    ma30: p.ma30,
  }));

  const trendColor = series.trend === "bullish" ? "text-pass" : series.trend === "bearish" ? "text-reject" : "text-muted-foreground";
  const TrendIcon = series.trend === "bullish" ? TrendingUp : series.trend === "bearish" ? TrendingDown : Activity;
  const changeColor = series.totalChange90d >= 0 ? "text-pass" : "text-reject";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CandlestickChart className="h-4 w-4 text-primary" />
            Price & Technicals
            <span className={`text-[9px] font-normal ${series.real ? "text-pass" : "text-muted-foreground/60"}`}>
              {series.real ? "(live Binance)" : "(synthetic)"}
            </span>
            <span className="text-[10px] text-muted-foreground font-normal">90d</span>
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {(["price", "volume", "rsi"] as const).map((v) => (
              <Button
                key={v}
                variant={view === v ? "default" : "outline"}
                size="sm"
                className="h-7 text-[11px] gap-1"
                onClick={() => setView(v)}
              >
                {v === "price" && <CandlestickChart className="h-3 w-3" />}
                {v === "volume" && <BarChart3 className="h-3 w-3" />}
                {v === "rsi" && <Activity className="h-3 w-3" />}
                {v.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        {/* Price summary strip */}
        <div className="flex items-center gap-4 flex-wrap mt-1">
          <div>
            <span className="font-mono text-lg font-bold num">{fmtUsd(series.current, false)}</span>
            <span className={cn("text-xs font-mono num ms-2", changeColor)}>
              {fmtPct(series.totalChange90d)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <TrendIcon className={cn("h-3.5 w-3.5", trendColor)} />
            <span className={trendColor}>{series.trend}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span>H: <span className="font-mono num">{fmtUsd(series.high90, false)}</span></span>
            <span>L: <span className="font-mono num">{fmtUsd(series.low90, false)}</span></span>
            <span>Vol: <span className="font-mono num">{fmtUsd(series.avgVolume)}</span></span>
            <span>σ: <span className="font-mono num">{series.volatility.toFixed(0)}%</span></span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {view === "price" ? (
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={9} tickLine={false} axisLine={false} interval={14} />
                <YAxis stroke="var(--muted-foreground)" fontSize={9} tickLine={false} axisLine={false} width={50} domain={["auto", "auto"]} tickFormatter={(v) => fmtUsd(v, false)} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "11px" }}
                  labelStyle={{ color: "var(--muted-foreground)" }}
                  formatter={(v: any, name: string) => [fmtUsd(Number(v), false), name === "price" ? "Price" : name === "ma7" ? "MA7" : "MA30"]}
                />
                {showMA && (
                  <>
                    <Line type="monotone" dataKey="ma7" stroke="var(--investigate)" strokeWidth={1.2} dot={false} name="MA7" />
                    <Line type="monotone" dataKey="ma30" stroke="var(--chart-4)" strokeWidth={1.2} dot={false} name="MA30" />
                  </>
                )}
                <Area type="monotone" dataKey="price" stroke="var(--primary)" strokeWidth={2} fill="url(#priceGrad)" name="price" />
                {series.support > 0 && (
                  <ReferenceLine y={series.support} stroke="var(--pass)" strokeDasharray="4 4" strokeWidth={1} opacity={0.5} label={{ value: "S", fontSize: 9, fill: "var(--pass)", position: "insideLeft" }} />
                )}
                {series.resistance > 0 && (
                  <ReferenceLine y={series.resistance} stroke="var(--reject)" strokeDasharray="4 4" strokeWidth={1} opacity={0.5} label={{ value: "R", fontSize: 9, fill: "var(--reject)", position: "insideLeft" }} />
                )}
              </AreaChart>
            ) : view === "volume" ? (
              <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={9} tickLine={false} axisLine={false} interval={14} />
                <YAxis stroke="var(--muted-foreground)" fontSize={9} tickLine={false} axisLine={false} width={50} tickFormatter={(v) => fmtUsd(v)} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "11px" }}
                  formatter={(v: any) => [fmtUsd(Number(v)), "Volume"]}
                />
                <Bar dataKey="volume" fill="var(--primary)" opacity={0.6} radius={[2, 2, 0, 0]} />
              </BarChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="rsiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-4)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--chart-4)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={9} tickLine={false} axisLine={false} interval={14} />
                <YAxis stroke="var(--muted-foreground)" fontSize={9} tickLine={false} axisLine={false} width={28} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "11px" }}
                  formatter={(v: any) => [Number(v).toFixed(1), "RSI"]}
                />
                <ReferenceLine y={70} stroke="var(--reject)" strokeDasharray="3 3" strokeWidth={1} opacity={0.5} />
                <ReferenceLine y={30} stroke="var(--pass)" strokeDasharray="3 3" strokeWidth={1} opacity={0.5} />
                <Area type="monotone" dataKey="rsi" stroke="var(--chart-4)" strokeWidth={1.8} fill="url(#rsiGrad)" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Indicators row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-border">
          <Indicator
            label="RSI (14)"
            value={series.indicators.rsi.toFixed(1)}
            signal={series.indicators.rsiSignal}
            tone={series.indicators.rsi < 30 ? "good" : series.indicators.rsi > 70 ? "bad" : "neutral"}
          />
          <Indicator
            label="MA Cross"
            value={series.indicators.maCross === "golden" ? "Golden" : series.indicators.maCross === "death" ? "Death" : "—"}
            signal={series.indicators.maCross === "golden" ? "bullish" : series.indicators.maCross === "death" ? "bearish" : "neutral"}
            tone={series.indicators.maCross === "golden" ? "good" : series.indicators.maCross === "death" ? "bad" : "neutral"}
          />
          <Indicator
            label="Momentum (10d)"
            value={fmtPct(series.indicators.momentum)}
            signal={series.indicators.momentum > 2 ? "bullish" : series.indicators.momentum < -2 ? "bearish" : "neutral"}
            tone={series.indicators.momentum > 0 ? "good" : "bad"}
          />
          <Indicator
            label="Volatility"
            value={`${series.volatility.toFixed(0)}%`}
            signal={series.volatility > 80 ? "high" : series.volatility > 50 ? "moderate" : "low"}
            tone={series.volatility > 80 ? "bad" : series.volatility > 50 ? "warn" : "good"}
          />
        </div>

        {view === "price" && (
          <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-muted-foreground">
            <button
              className={cn("flex items-center gap-1 hover:text-foreground transition-colors", showMA && "text-foreground")}
              onClick={() => setShowMA(!showMA)}
            >
              <span className={cn("h-2 w-2 rounded-sm", showMA ? "bg-investigate" : "bg-muted-foreground/40")} />
              MA7
            </button>
            <button
              className={cn("flex items-center gap-1 hover:text-foreground transition-colors", showMA && "text-foreground")}
              onClick={() => setShowMA(!showMA)}
            >
              <span className={cn("h-2 w-2 rounded-sm", showMA ? "bg-chart-4" : "bg-muted-foreground/40")} />
              MA30
            </button>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-pass/60" /> Support
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-reject/60" /> Resistance
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Indicator({
  label,
  value,
  signal,
  tone,
}: {
  label: string;
  value: string;
  signal: string;
  tone: "good" | "warn" | "bad" | "neutral";
}) {
  const color = tone === "good" ? "text-pass" : tone === "warn" ? "text-investigate" : tone === "bad" ? "text-reject" : "text-foreground";
  return (
    <div className="rounded-lg bg-muted/40 p-2">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight">{label}</div>
      <div className={cn("font-mono text-sm font-bold num", color)}>{value}</div>
      <div className={cn("text-[9px] capitalize", color)}>{signal}</div>
    </div>
  );
}
