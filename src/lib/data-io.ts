"use client";

import { useWatchlist } from "@/lib/watchlist-store";
import { usePortfolio } from "@/lib/portfolio-store";
import { useAlerts } from "@/lib/alerts-store";
import { toast } from "sonner";

interface ExportData {
  version: string;
  exportedAt: string;
  watchlist: any[];
  portfolio: any[];
  alertRules: any[];
}

export function exportAllData(): ExportData {
  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    watchlist: useWatchlist.getState().items,
    portfolio: usePortfolio.getState().positions,
    alertRules: useAlerts.getState().rules,
  };
}

export function downloadJson(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function importAllData(data: ExportData): { watchlist: number; portfolio: number; rules: number } {
  const result = { watchlist: 0, portfolio: 0, rules: 0 };

  if (data.watchlist && Array.isArray(data.watchlist)) {
    const store = useWatchlist.getState();
    for (const item of data.watchlist) {
      if (!store.has(item.symbol)) {
        store.add({
          symbol: item.symbol,
          name: item.name,
          sector: item.sector,
          logoUrl: item.logoUrl,
        });
        result.watchlist++;
      }
    }
  }

  if (data.portfolio && Array.isArray(data.portfolio)) {
    const store = usePortfolio.getState();
    for (const pos of data.portfolio) {
      store.add({
        symbol: pos.symbol,
        name: pos.name,
        logoUrl: pos.logoUrl,
        entryPrice: pos.entryPrice,
        quantity: pos.quantity,
        entryDate: pos.entryDate,
        notes: pos.notes,
      });
      result.portfolio++;
    }
  }

  if (data.alertRules && Array.isArray(data.alertRules)) {
    const store = useAlerts.getState();
    for (const rule of data.alertRules) {
      store.addRule({
        type: rule.type,
        symbol: rule.symbol,
        label: rule.label,
        condition: rule.condition,
        threshold: rule.threshold,
        severity: rule.severity,
        enabled: rule.enabled,
      });
      result.rules++;
    }
  }

  return result;
}

export function handleExport() {
  const data = exportAllData();
  downloadJson(data, `cryptosieve-backup-${new Date().toISOString().slice(0, 10)}.json`);
  toast.success("Data exported");
}

export function handleImport(file: File) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string) as ExportData;
      if (!data.version) {
        toast.error("Invalid backup file");
        return;
      }
      const counts = importAllData(data);
      toast.success(`Imported: ${counts.watchlist} watchlist, ${counts.portfolio} positions, ${counts.rules} rules`);
    } catch (err) {
      toast.error("Failed to parse backup file");
    }
  };
  reader.readAsText(file);
}
