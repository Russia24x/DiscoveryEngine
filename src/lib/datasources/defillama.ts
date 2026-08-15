// DeFiLlama free adapter (completely free, no key, no rate limit issues).
// Docs: https://defillama.com/docs/api
import type { DataSourceAdapter, FundamentalsRow, MarketDataRow } from "./types";
import { fetchWithTimeout } from "./fetch-utils";

const BASE = "https://api.llama.fi";
const STABLES = "https://stablecoins.llama.fi";
const YIELDS = "https://yields.llama.fi";

interface LlamaProtocol {
  id?: string;
  name?: string;
  symbol?: string;
  gecko_id?: string | null;
  tvl?: number;
  fees_24h?: number;
  revenue_24h?: number;
  tokenHolderRevenue?: number;
  category?: string;
  chain?: string;
  chainTvls?: Record<string, { tvl?: number }>;
}

export const defillama: DataSourceAdapter = {
  key: "defillama",
  name: "DeFiLlama",
  type: "free",
  requiresKey: false,
  endpoint: BASE,
  coverage: "TVL, Fees, Revenue, Tokenholder capture, Protocol metadata",

  async fetchMarketData(_symbols?: string[], _apiKey?: string): Promise<MarketDataRow[]> {
    // DeFiLlama is fundamentals-focused; market data comes from CoinGecko.
    return [];
  },

  async fetchFundamentals(symbols?: string[], _apiKey?: string): Promise<FundamentalsRow[]> {
    try {
      const res = await fetchWithTimeout(`${BASE}/overview/fees`, {
        headers: { accept: "application/json" },
        next: { revalidate: 120 },
      });
      if (!res.ok) throw new Error(`DeFiLlama fees ${res.status}`);
      const data = (await res.json()) as { protocols?: Record<string, LlamaProtocol> };
      const protocols = data.protocols ?? {};
      let rows: FundamentalsRow[] = Object.values(protocols).map((p) => {
        const fees24 = p.fees_24h ?? 0;
        const rev24 = p.revenue_24h ?? 0;
        const th24 = p.tokenHolderRevenue ?? 0;
        return {
          symbol: (p.symbol ?? p.name ?? p.id ?? "").toUpperCase(),
          tvl: p.tvl,
          feesAnnual: fees24 * 365,
          revenueAnnual: rev24 * 365,
          protocolCapture: rev24 * 365, // PR proxy = revenue
          tokenholderCapture: th24 * 365, // TC = tokenholder revenue
        };
      });
      if (symbols && symbols.length > 0) {
        const want = new Set(symbols.map((s) => s.toUpperCase()));
        rows = rows.filter((r) => want.has(r.symbol));
      }
      return rows;
    } catch (e) {
      console.error("[defillama] fetch failed:", e);
      return [];
    }
  },
};
