// CoinGecko free adapter (no API key required for public endpoints).
// Docs: https://docs.coingecko.com/reference/introduction
import type { DataSourceAdapter, MarketDataRow } from "./types";
import { fetchWithTimeout } from "./fetch-utils";

const BASE = "https://api.coingecko.com/api/v3";

export const coingecko: DataSourceAdapter = {
  key: "coingecko",
  name: "CoinGecko",
  type: "free",
  requiresKey: false,
  endpoint: BASE,
  coverage: "Market data, Price, Market Cap, FDV, Supply",

  async fetchMarketData(symbols?: string[], _apiKey?: string): Promise<MarketDataRow[]> {
    const url = `${BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=90d`;
    try {
      const res = await fetchWithTimeout(url, {
        headers: { accept: "application/json" },
        next: { revalidate: 60 },
      });
      if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
      const data = (await res.json()) as Array<{
        symbol?: string;
        name?: string;
        current_price?: number;
        market_cap?: number;
        fully_diluted_valuation?: number;
        total_supply?: number;
        circulating_supply?: number;
        image?: string;
        price_change_percentage_90d_in_currency?: number;
      }>;
      let rows: MarketDataRow[] = data.map((d) => ({
        symbol: (d.symbol ?? "").toUpperCase(),
        name: d.name,
        priceUsd: d.current_price,
        marketCap: d.market_cap,
        fdv: d.fully_diluted_valuation,
        totalSupply: d.total_supply,
        floatSupply: d.circulating_supply,
        logoUrl: d.image,
        priceChange90d: d.price_change_percentage_90d_in_currency,
      }));
      if (symbols && symbols.length > 0) {
        const want = new Set(symbols.map((s) => s.toUpperCase()));
        rows = rows.filter((r) => want.has(r.symbol));
      }
      return rows;
    } catch (e) {
      console.error("[coingecko] fetch failed:", e);
      return [];
    }
  },

  async fetchFundamentals(_symbols?: string[], _apiKey?: string) {
    // CoinGecko free does not expose protocol fees/revenue reliably.
    return [];
  },
};
