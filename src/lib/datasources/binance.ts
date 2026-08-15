// Binance public adapter — free, no key. Used for live price precision.
import type { DataSourceAdapter, MarketDataRow } from "./types";
import { fetchWithTimeout } from "./fetch-utils";

const BASE = "https://api.binance.com/api/v3";

export const binance: DataSourceAdapter = {
  key: "binance",
  name: "Binance",
  type: "free",
  requiresKey: false,
  endpoint: BASE,
  coverage: "Live spot prices (USD via USDT)",

  async fetchMarketData(symbols?: string[], _apiKey?: string): Promise<MarketDataRow[]> {
    try {
      const url = `${BASE}/ticker/price`;
      const res = await fetchWithTimeout(url, { next: { revalidate: 30 } });
      if (!res.ok) throw new Error(`Binance ${res.status}`);
      const data = (await res.json()) as Array<{ symbol: string; price: string }>;
      const usdtRows = data
        .filter((d) => d.symbol.endsWith("USDT"))
        .map((d) => ({
          symbol: d.symbol.replace(/USDT$/, "").toUpperCase(),
          priceUsd: parseFloat(d.price),
        }));
      let rows: MarketDataRow[] = usdtRows;
      if (symbols && symbols.length > 0) {
        const want = new Set(symbols.map((s) => s.toUpperCase()));
        rows = rows.filter((r) => want.has(r.symbol));
      }
      return rows;
    } catch (e) {
      console.error("[binance] fetch failed:", e);
      return [];
    }
  },

  async fetchFundamentals() {
    return [];
  },
};
