"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { useApp } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { usePortfolio, computePnl, type Position } from "@/lib/portfolio-store";
import { fmtUsd, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Briefcase, Plus, Trash2, TrendingUp, TrendingDown, Wallet, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface PriceMap {
  [symbol: string]: { price?: number; iaFinal?: number; decision?: string };
}

export function PortfolioView() {
  const { t } = useI18n();
  const { openProject } = useApp();
  const { positions, load, remove } = usePortfolio();
  const [prices, setPrices] = useState<PriceMap>({});
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  // Fetch current prices for all positions.
  const [priceError, setPriceError] = useState<string | null>(null);
  useEffect(() => {
    if (positions.length === 0) return;
    let cancelled = false;
    fetch("/api/projects?showRejected=1")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => {
        if (cancelled) return;
        const map: PriceMap = {};
        for (const p of j.projects ?? []) {
          map[p.symbol] = { price: p.priceUsd, iaFinal: p.iaFinal, decision: p.decision };
        }
        setPrices(map);
        setPriceError(null);
      })
      .catch((e) => {
        if (!cancelled) setPriceError(e?.message ?? "Failed to load prices");
      });
    return () => {
      cancelled = true;
    };
  }, [positions]);

  // Compute totals.
  const totals = positions.reduce(
    (acc, pos) => {
      const p = computePnl(pos, prices[pos.symbol]?.price);
      acc.costBasis += p.costBasis;
      acc.currentValue += p.currentValue;
      acc.pnl += p.pnl;
      return acc;
    },
    { costBasis: 0, currentValue: 0, pnl: 0 }
  );
  const totalPnlPct = totals.costBasis > 0 ? (totals.pnl / totals.costBasis) * 100 : 0;
  const isProfit = totals.pnl >= 0;

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <Card className={cn("border-2 overflow-hidden", isProfit ? "border-pass/30 bg-pass/5" : totals.pnl < 0 ? "border-reject/30 bg-reject/5" : "border-border")}>
        <div className="relative">
          <div className="absolute inset-0 grid-bg opacity-15 pointer-events-none" />
          <CardContent className="relative p-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", isProfit ? "bg-pass/15 text-pass" : "bg-reject/15 text-reject")}>
                  <Wallet className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-sm font-bold">Portfolio</div>
                  <div className="text-xs text-muted-foreground">{positions.length} positions</div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Cost Basis</div>
                  <div className="font-mono text-lg font-bold num">{fmtUsd(totals.costBasis)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Current Value</div>
                  <div className="font-mono text-lg font-bold num">{fmtUsd(totals.currentValue)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">P&L</div>
                  <div className={cn("font-mono text-xl font-bold num flex items-center gap-1", isProfit ? "text-pass" : "text-reject")}>
                    {isProfit ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {fmtUsd(Math.abs(totals.pnl))}
                    <span className="text-xs">({fmtPct(totalPnlPct)})</span>
                  </div>
                </div>
              </div>
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-1.5">
                    <Plus className="h-4 w-4" /> Add Position
                  </Button>
                </DialogTrigger>
                <AddPositionDialog onClose={() => setAddOpen(false)} />
              </Dialog>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Price fetch error */}
      {priceError && positions.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-investigate/30 bg-investigate/5 p-2.5 text-xs">
          <AlertCircle className="h-3.5 w-3.5 text-investigate shrink-0" />
          <span className="text-investigate">Prices may be stale: {priceError}</span>
        </div>
      )}

      {/* Positions list */}
      {positions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center text-center gap-3">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Briefcase className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">No positions yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add a position to track your portfolio P&L alongside CryptoSieve scores.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-start font-medium px-3 py-2">Asset</th>
                    <th className="text-end font-medium px-3 py-2">Qty</th>
                    <th className="text-end font-medium px-3 py-2">Entry</th>
                    <th className="text-end font-medium px-3 py-2">Current</th>
                    <th className="text-end font-medium px-3 py-2">Cost Basis</th>
                    <th className="text-end font-medium px-3 py-2">Value</th>
                    <th className="text-end font-medium px-3 py-2">P&L</th>
                    <th className="text-center font-medium px-3 py-2">IA</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((pos) => (
                    <PositionRow
                      key={pos.id}
                      pos={pos}
                      priceData={prices[pos.symbol]}
                      onOpen={() => openProject(pos.symbol)}
                      onRemove={() => {
                        remove(pos.id);
                        toast.success(`Removed ${pos.symbol} position`);
                      }}
                    />
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border">
                    <td className="px-3 py-3 font-semibold text-xs" colSpan={4}>Total</td>
                    <td className="px-3 py-3 text-end font-mono font-bold num text-xs">{fmtUsd(totals.costBasis)}</td>
                    <td className="px-3 py-3 text-end font-mono font-bold num text-xs">{fmtUsd(totals.currentValue)}</td>
                    <td className={cn("px-3 py-3 text-end font-mono font-bold num text-xs", isProfit ? "text-pass" : "text-reject")}>
                      {fmtUsd(Math.abs(totals.pnl))} ({fmtPct(totalPnlPct)})
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PositionRow({
  pos,
  priceData,
  onOpen,
  onRemove,
}: {
  pos: Position;
  priceData?: { price?: number; iaFinal?: number; decision?: string };
  onOpen: () => void;
  onRemove: () => void;
}) {
  const pnl = computePnl(pos, priceData?.price);
  const isProfit = pnl.pnl >= 0;
  const currentPrice = priceData?.price ?? pos.entryPrice;

  return (
    <tr className="border-t border-border hover:bg-muted/40 transition-colors group">
      <td className="px-3 py-2.5">
        <button onClick={onOpen} className="flex items-center gap-2 text-start">
          {pos.logoUrl ? (
            <img src={pos.logoUrl} alt="" className="h-7 w-7 rounded-full" />
          ) : (
            <div className="h-7 w-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-[10px] font-bold text-primary">
              {pos.symbol.slice(0, 2)}
            </div>
          )}
          <div>
            <div className="font-semibold text-xs">{pos.symbol}</div>
            <div className="text-[10px] text-muted-foreground">{pos.name}</div>
          </div>
        </button>
      </td>
      <td className="px-3 py-2.5 text-end font-mono num text-xs">{pos.quantity.toLocaleString()}</td>
      <td className="px-3 py-2.5 text-end font-mono num text-xs text-muted-foreground">{fmtUsd(pos.entryPrice, false)}</td>
      <td className="px-3 py-2.5 text-end font-mono num text-xs">{fmtUsd(currentPrice, false)}</td>
      <td className="px-3 py-2.5 text-end font-mono num text-xs">{fmtUsd(pnl.costBasis)}</td>
      <td className="px-3 py-2.5 text-end font-mono num text-xs">{fmtUsd(pnl.currentValue)}</td>
      <td className={cn("px-3 py-2.5 text-end font-mono num text-xs font-bold", isProfit ? "text-pass" : "text-reject")}>
        {isProfit ? "+" : ""}{fmtUsd(Math.abs(pnl.pnl))}
        <div className={cn("text-[9px]", isProfit ? "text-pass" : "text-reject")}>
          {fmtPct(pnl.pnlPct)}
        </div>
      </td>
      <td className="px-3 py-2.5 text-center">
        {priceData?.iaFinal != null && (
          <span className={cn(
            "font-mono text-xs font-bold num",
            priceData.iaFinal >= 18 ? "text-pass" : priceData.iaFinal >= 12 ? "text-investigate" : "text-reject"
          )}>
            {priceData.iaFinal.toFixed(1)}
          </span>
        )}
      </td>
      <td className="px-2 py-2.5">
        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-reject" />
        </Button>
      </td>
    </tr>
  );
}

function AddPositionDialog({ onClose }: { onClose: () => void }) {
  const { add } = usePortfolio();
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [available, setAvailable] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/projects?showRejected=1")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setAvailable(j.projects ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSymbolChange(val: string) {
    setSymbol(val.toUpperCase());
    const match = available.find((p) => p.symbol === val.toUpperCase());
    if (match) {
      setName(match.name);
      if (match.priceUsd) setEntryPrice(match.priceUsd.toString());
    }
  }

  function handleSubmit() {
    const price = parseFloat(entryPrice);
    const qty = parseFloat(quantity);
    if (!symbol || !name || isNaN(price) || isNaN(qty) || price <= 0 || qty <= 0) {
      toast.error("Fill all fields with valid values");
      return;
    }
    const match = available.find((p) => p.symbol === symbol);
    add({
      symbol,
      name,
      logoUrl: match?.logoUrl,
      entryPrice: price,
      quantity: qty,
      entryDate: new Date().toISOString(),
    });
    toast.success(`Added ${qty} ${symbol} at ${fmtUsd(price)}`);
    onClose();
    // Reset
    setSymbol("");
    setName("");
    setEntryPrice("");
    setQuantity("");
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Add Position</DialogTitle>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Symbol</Label>
          <Input
            value={symbol}
            onChange={(e) => handleSymbolChange(e.target.value)}
            placeholder="e.g. HYPE"
            list="portfolio-symbols"
            className="text-sm"
          />
          <datalist id="portfolio-symbols">
            {available.map((p) => (
              <option key={p.symbol} value={p.symbol}>
                {p.name} — {fmtUsd(p.priceUsd)}
              </option>
            ))}
          </datalist>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" className="text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Entry Price (USD)</Label>
            <Input
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              placeholder="0.00"
              type="number"
              step="any"
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Quantity</Label>
            <Input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              type="number"
              step="any"
              className="text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit}>Add Position</Button>
        </div>
      </div>
    </DialogContent>
  );
}
