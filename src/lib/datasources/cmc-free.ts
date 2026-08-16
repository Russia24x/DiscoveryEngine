// CoinMarketCap keyless public API adapter.
// Uses the web data API (no API key required) — same endpoints the CMC website uses.
// Docs: https://coinmarketcap.com/api/documentation/pro-api-reference/keyless-public-api
//
// This is NOT the Pro API. It's the public web API that returns the same data
// the CMC website displays, including: price, market cap, FDV, supply,
// 90d price change, volume, tags, audit info.
import type { DataSourceAdapter, MarketDataRow } from "./types";
import { fetchWithTimeout } from "./fetch-utils";

const BASE = "https://api.coinmarketcap.com/data-api/v3";

interface CmcListing {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  tags?: string[];
  cmcRank: number;
  circulatingSupply?: number;
  totalSupply?: number;
  maxSupply?: number;
  isAudited?: number;
  quotes?: Array<{
    price?: number;
    marketCap?: number;
    fullyDilluttedMarketCap?: number;
    volume24h?: number;
    percentChange90d?: number;
    percentChange30d?: number;
    percentChange7d?: number;
    percentChange24h?: number;
  }>;
}

export const cmcFree: DataSourceAdapter = {
  key: "cmc",
  name: "CoinMarketCap",
  type: "free",
  requiresKey: false,
  endpoint: BASE,
  coverage: "Market data, Price, Market Cap, FDV, Supply, Volume, Tags, Audit info",

  async fetchMarketData(_symbols?: string[], _apiKey?: string): Promise<MarketDataRow[]> {
    try {
      // Fetch top 200 by market cap (keyless endpoint, no auth needed).
      const url = `${BASE}/cryptocurrency/listing?start=1&limit=200&sortBy=market_cap&sortType=desc&convert=USD&cryptoType=all&tagType=all&audited=false`;
      const res = await fetchWithTimeout(url, {
        headers: { accept: "application/json" },
        next: { revalidate: 120 }, // 2-minute cache
      }, 8000);

      if (!res.ok) throw new Error(`CMC free ${res.status}`);
      const data = (await res.json()) as { data?: { cryptoCurrencyList?: CmcListing[] } };
      const list = data.data?.cryptoCurrencyList ?? [];

      return list.map((c) => {
        const q = c.quotes?.[0];
        // Derive sector from tags (first tag that's not a portfolio/infrastructure tag).
        const sectorTag = c.tags?.find((t) =>
          !t.endsWith("-portfolio") && !t.endsWith("-ecosystem") &&
          !t.includes("binance-") && !t.includes("ftx-") &&
          !t.includes("sec-") && !t.includes("2017-")
        );

        return {
          symbol: c.symbol.toUpperCase(),
          name: c.name,
          priceUsd: q?.price,
          marketCap: q?.marketCap,
          fdv: q?.fullyDilluttedMarketCap,
          totalSupply: c.totalSupply,
          floatSupply: c.circulatingSupply,
          priceChange90d: q?.percentChange90d,
          sector: sectorTag,
          // CMC doesn't provide chain or logo via this endpoint.
        };
      });
    } catch (e) {
      console.error("[cmc-free] fetch failed:", e);
      return [];
    }
  },

  async fetchFundamentals() {
    return [];
  },
};
