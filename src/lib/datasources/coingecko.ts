// CoinGecko free adapter (no API key required for public endpoints).
// Docs: https://docs.coingecko.com/reference/introduction
// Free tier has rate limits (~30 req/min). We use 300s cache + retry on 429.
import type { DataSourceAdapter, MarketDataRow } from "./types";
import { fetchWithTimeout } from "./fetch-utils";

const BASE = "https://api.coingecko.com/api/v3";

// Simple sleep for retry backoff.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const coingecko: DataSourceAdapter = {
  key: "coingecko",
  name: "CoinGecko",
  type: "free",
  requiresKey: false,
  endpoint: BASE,
  coverage: "Market data, Price, Market Cap, FDV, Supply",

  async fetchMarketData(symbols?: string[], _apiKey?: string): Promise<MarketDataRow[]> {
    const url = `${BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=90d`;

    // Retry on 429 (rate limited) with exponential backoff.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetchWithTimeout(url, {
          headers: { accept: "application/json" },
          next: { revalidate: 300 }, // 5-minute cache to avoid rate limits
        }, 8000); // 8s timeout for 250 coins

        if (res.status === 429) {
          console.warn(`[coingecko] rate limited (429), retry ${attempt + 1}/3 after ${2 * (attempt + 1)}s`);
          await sleep(2000 * (attempt + 1));
          continue;
        }

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
        if (attempt < 2) {
          console.warn(`[coingecko] attempt ${attempt + 1} failed, retrying...`, e);
          await sleep(1000 * (attempt + 1));
          continue;
        }
        console.error("[coingecko] fetch failed after 3 attempts:", e);
        return [];
      }
    }
    return [];
  },

  async fetchFundamentals(_symbols?: string[], _apiKey?: string) {
    return [];
  },
};
