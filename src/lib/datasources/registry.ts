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

// ─── Universe cache with TTL ──────────────────────────────────────────────────
// Avoids hammering CoinGecko/DeFiLlama on every request. The universe is
// cached for CACHE_TTL_MS (default 60s). Each call to collectUniverse checks
// the cache first; if fresh, returns immediately without network calls.
const CACHE_TTL_MS = 60_000; // 60 seconds

interface CachedUniverse {
  inputs: ReturnType<typeof toProjectInput>[];
  live: boolean;
  sourcesUsed: string[];
  timestamp: number;
}

let universeCache: CachedUniverse | null = null;

export function clearUniverseCache() {
  universeCache = null;
}

// Collect a full universe of project inputs.
// Strategy: the bundle (22 representative projects with full fundamentals) is ALWAYS
// the base. If live market data is reachable, we overlay live prices/mcaps onto matching
// bundle projects — giving live prices + proper fundamentals. This guarantees meaningful
// scores even when only market data (not fundamentals) is available from free APIs.
export async function collectUniverse(opts?: {
  useLive?: boolean;
  enabledKeys?: string[];
  apiKeys?: Record<string, string>;
  skipCache?: boolean;
}): Promise<{
  inputs: ReturnType<typeof toProjectInput>[];
  live: boolean;
  sourcesUsed: string[];
}> {
  // Check cache first (unless explicitly skipped or useLive=false which uses bundle only).
  const useLive = opts?.useLive ?? true;
  if (useLive && !opts?.skipCache && universeCache) {
    const age = Date.now() - universeCache.timestamp;
    if (age < CACHE_TTL_MS) {
      return {
        inputs: universeCache.inputs,
        live: universeCache.live,
        sourcesUsed: universeCache.sourcesUsed,
      };
    }
  }

  const enabled = opts?.enabledKeys ?? ["coingecko", "defillama", "binance"];
  const apiKeys = opts?.apiKeys ?? {};

  const sourcesUsed: string[] = [];
  const bundle = getBundleUniverse();

  // 1) Try live market data (CoinGecko) — used to refresh prices/mcaps on bundle projects.
  let liveMarketBySymbol = new Map<string, MarketDataRow>();
  let liveFundamentalsBySymbol = new Map<string, FundamentalsRow>();

  if (useLive) {
    const cg = getAdapter("coingecko");
    if (cg && enabled.includes("coingecko")) {
      const rows = await cg.fetchMarketData(undefined, apiKeys.coingecko);
      if (rows.length > 0) {
        liveMarketBySymbol = new Map(rows.map((r) => [r.symbol, r]));
        sourcesUsed.push("coingecko");
      }
    }
    const dl = getAdapter("defillama");
    if (dl && enabled.includes("defillama")) {
      const fund = await dl.fetchFundamentals(undefined, apiKeys.defillama);
      if (fund.length > 0) {
        liveFundamentalsBySymbol = new Map(fund.map((f) => [f.symbol, f]));
        sourcesUsed.push("defillama");
      }
    }
    if (enabled.includes("binance")) sourcesUsed.push("binance");
  }

  const live = liveMarketBySymbol.size > 0;

  // 2) Build the universe: bundle base, with live market data overlaid where available.
  const inputs = bundle.map(({ market, fundamentals }) => {
    // Prefer live fundamentals (DeFiLlama) if present, else bundle fundamentals.
    const liveFund = liveFundamentalsBySymbol.get(market.symbol);
    const fund = liveFund ?? fundamentals;
    // Overlay live market data (price, mcap, fdv, supply) onto the bundle market row.
    const liveMkt = liveMarketBySymbol.get(market.symbol);
    const mergedMarket: MarketDataRow = liveMkt
      ? {
          ...market,
          priceUsd: liveMkt.priceUsd ?? market.priceUsd,
          marketCap: liveMkt.marketCap ?? market.marketCap,
          fdv: liveMkt.fdv ?? market.fdv,
          totalSupply: liveMkt.totalSupply ?? market.totalSupply,
          floatSupply: liveMkt.floatSupply ?? market.floatSupply,
          logoUrl: liveMkt.logoUrl ?? market.logoUrl,
          priceChange90d: liveMkt.priceChange90d ?? market.priceChange90d,
        }
      : market;
    return toProjectInput(mergedMarket, fund);
  });

  // Cache the result if live data was used (don't cache bundle-only fallback,
  // as it's instant and doesn't benefit from caching).
  if (live) {
    universeCache = { inputs, live, sourcesUsed: live ? sourcesUsed : ["bundle"], timestamp: Date.now() };
  }

  return { inputs, live, sourcesUsed: live ? sourcesUsed : ["bundle"] };
}
