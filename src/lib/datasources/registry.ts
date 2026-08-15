// Data source registry & manager.
// Pluggable: free adapters today, key-based adapters tomorrow (same interface).
import { binance } from "./binance";
import { coingecko } from "./coingecko";
import { defillama } from "./defillama";
import { getBundleUniverse } from "./bundle";
import { toProjectInput, type DataSourceAdapter, type FundamentalsRow, type MarketDataRow } from "./types";

// All known adapters (free + future key-based stubs).
export const ADAPTERS: DataSourceAdapter[] = [
  coingecko,
  defillama,
  binance,
  // ── Future key-based adapters (interface-ready stubs) ──
  {
    key: "cmc",
    name: "CoinMarketCap",
    type: "apikey",
    requiresKey: true,
    endpoint: "https://pro-api.coinmarketcap.com/v1",
    coverage: "Market data, listings",
    async fetchMarketData() { return []; },
    async fetchFundamentals() { return []; },
  },
  {
    key: "messari",
    name: "Messari",
    type: "apikey",
    requiresKey: true,
    endpoint: "https://data.messari.io/api/v1",
    coverage: "Protocol research, fundamentals",
    async fetchMarketData() { return []; },
    async fetchFundamentals() { return []; },
  },
  {
    key: "nansen",
    name: "Nansen",
    type: "apikey",
    requiresKey: true,
    endpoint: "https://api.nansen.ai/v1",
    coverage: "Smart money, wallet intelligence",
    async fetchMarketData() { return []; },
    async fetchFundamentals() { return []; },
  },
];

export function getAdapter(key: string): DataSourceAdapter | undefined {
  return ADAPTERS.find((a) => a.key === key);
}

// Collect a full universe of project inputs, preferring live adapters and
// falling back to the bundled dataset so the engine ALWAYS has something to rank.
export async function collectUniverse(opts?: {
  useLive?: boolean;
  enabledKeys?: string[];
  apiKeys?: Record<string, string>;
}): Promise<{
  inputs: ReturnType<typeof toProjectInput>[];
  live: boolean;
  sourcesUsed: string[];
}> {
  const enabled = opts?.enabledKeys ?? ["coingecko", "defillama", "binance"];
  const apiKeys = opts?.apiKeys ?? {};
  const useLive = opts?.useLive ?? true;

  const sourcesUsed: string[] = [];

  // 1) Try live market data (CoinGecko).
  let marketRows: MarketDataRow[] = [];
  let fundamentalsBySymbol = new Map<string, FundamentalsRow>();

  if (useLive) {
    const cg = getAdapter("coingecko");
    if (cg && enabled.includes("coingecko")) {
      const rows = await cg.fetchMarketData(undefined, apiKeys.coingecko);
      if (rows.length > 0) {
        marketRows = rows;
        sourcesUsed.push("coingecko");
      }
    }
    const dl = getAdapter("defillama");
    if (dl && enabled.includes("defillama")) {
      const fund = await dl.fetchFundamentals(undefined, apiKeys.defillama);
      if (fund.length > 0) {
        fundamentalsBySymbol = new Map(fund.map((f) => [f.symbol, f]));
        sourcesUsed.push("defillama");
      }
    }
    const bn = getAdapter("binance");
    if (bn && enabled.includes("binance")) {
      // Only used to refine prices for symbols we already have.
      // (kept lightweight)
      sourcesUsed.push("binance");
    }
  }

  const live = marketRows.length > 0;

  if (!live) {
    // Fallback: bundled dataset.
    const bundle = getBundleUniverse();
    const inputs = bundle.map(({ market, fundamentals }) =>
      toProjectInput(market, fundamentals)
    );
    return { inputs, live: false, sourcesUsed: ["bundle"] };
  }

  // Merge live market + fundamentals.
  const inputs = marketRows.map((m) => {
    const f = fundamentalsBySymbol.get(m.symbol);
    return toProjectInput(m, f);
  });
  return { inputs, live: true, sourcesUsed };
}
