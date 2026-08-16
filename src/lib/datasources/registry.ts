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
  // ── Key-based adapters (functional when API key is provided) ──
  {
    key: "cmc",
    name: "CoinMarketCap",
    type: "apikey",
    requiresKey: true,
    endpoint: "https://pro-api.coinmarketcap.com/v1",
    coverage: "Market data, listings",
    async fetchMarketData(_symbols?: string[], apiKey?: string) {
      if (!apiKey) return [];
      try {
        const { fetchWithTimeout } = await import("./fetch-utils");
        const res = await fetchWithTimeout(
          `${this.endpoint}/cryptocurrency/listings/latest?limit=100&convert=USD`,
          { headers: { "X-CMC_PRO_API_KEY": apiKey, accept: "application/json" } },
          5000
        );
        if (!res.ok) return [];
        const data = await res.json();
        return (data.data ?? []).map((d: any) => ({
          symbol: (d.symbol ?? "").toUpperCase(),
          name: d.name,
          priceUsd: d.quote?.USD?.price,
          marketCap: d.quote?.USD?.market_cap,
          fdv: d.quote?.USD?.fully_diluted_market_cap,
          totalSupply: d.total_supply,
          floatSupply: d.circulating_supply,
        }));
      } catch { return []; }
    },
    async fetchFundamentals() { return []; },
  },
  {
    key: "messari",
    name: "Messari",
    type: "apikey",
    requiresKey: true,
    endpoint: "https://data.messari.io/api/v1",
    coverage: "Protocol research, fundamentals",
    async fetchMarketData(_symbols?: string[], apiKey?: string) {
      if (!apiKey) return [];
      try {
        const { fetchWithTimeout } = await import("./fetch-utils");
        const res = await fetchWithTimeout(
          `${this.endpoint}/assets?limit=100&fields=symbol,name,metrics/market_data/price_usd,metrics/market_data/marketcap_usd`,
          { headers: { "x-messari-api-key": apiKey, accept: "application/json" } },
          5000
        );
        if (!res.ok) return [];
        const data = await res.json();
        return (data.data ?? []).map((d: any) => ({
          symbol: (d.symbol ?? "").toUpperCase(),
          name: d.name,
          priceUsd: d.metrics?.market_data?.price_usd,
          marketCap: d.metrics?.market_data?.marketcap_usd,
        }));
      } catch { return []; }
    },
    async fetchFundamentals() { return []; },
  },
  {
    key: "nansen",
    name: "Nansen",
    type: "apikey",
    requiresKey: true,
    endpoint: "https://api.nansen.ai/v1",
    coverage: "Smart money, wallet intelligence",
    // Nansen API requires a paid subscription; endpoint not publicly documented.
    // Returns empty until API spec is available. Key is stored encrypted at rest.
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

// Collect a full universe of project inputs via metric-driven discovery.
// Flow: fetch ALL coins from CoinGecko + ALL protocols from DeFiLlama → merge by symbol → score.
// The bundle (22 hardcoded projects) is ONLY used as fallback when both APIs fail.
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

  // ── 1) Fetch ALL market data from CoinGecko (250 coins) ──
  let marketBySymbol = new Map<string, MarketDataRow>();
  if (useLive) {
    const cg = getAdapter("coingecko");
    if (cg && enabled.includes("coingecko")) {
      const rows = await cg.fetchMarketData(undefined, apiKeys.coingecko);
      if (rows.length > 0) {
        marketBySymbol = new Map(rows.map((r) => [r.symbol, r]));
        sourcesUsed.push("coingecko");
      }
    }

    // ── 2) Fetch ALL fundamentals from DeFiLlama (hundreds of protocols) ──
    let fundamentalsBySymbol = new Map<string, FundamentalsRow>();
    const dl = getAdapter("defillama");
    if (dl && enabled.includes("defillama")) {
      const fund = await dl.fetchFundamentals(undefined, apiKeys.defillama);
      if (fund.length > 0) {
        fundamentalsBySymbol = new Map(fund.map((f) => [f.symbol, f]));
        sourcesUsed.push("defillama");
      }
    }

    // ── 3) Fetch live prices from Binance (generous rate limits) ──
    if (enabled.includes("binance")) {
      const bn = getAdapter("binance");
      if (bn) {
        const bnRows = await bn.fetchMarketData(undefined, apiKeys.binance);
        if (bnRows.length > 0) {
          // Enrich: if CoinGecko didn't provide price for a symbol, use Binance.
          for (const r of bnRows) {
            if (!marketBySymbol.has(r.symbol)) {
              marketBySymbol.set(r.symbol, r);
            } else {
              // If CoinGecko had it but no price, use Binance price.
              const existing = marketBySymbol.get(r.symbol)!;
              if (existing.priceUsd == null && r.priceUsd != null) {
                existing.priceUsd = r.priceUsd;
              }
            }
          }
          sourcesUsed.push("binance");
        }
      }
    }

    // ── 4) Try key-based adapters (CMC, Messari) if API keys provided ──
    for (const adapterKey of ["cmc", "messari"]) {
      const adapter = getAdapter(adapterKey);
      const key = apiKeys[adapterKey];
      if (adapter && enabled.includes(adapterKey) && key) {
        const rows = await adapter.fetchMarketData(undefined, key);
        if (rows.length > 0) {
          for (const r of rows) marketBySymbol.set(r.symbol, r);
          if (!sourcesUsed.includes(adapterKey)) sourcesUsed.push(adapterKey);
        }
      }
    }

    // ── 4) Discovery: merge CoinGecko + DeFiLlama by symbol ──
    // Projects in BOTH sources: full data (market + fundamentals).
    // Projects only in CoinGecko: market only (no fundamentals → will fail VAE gate, correct).
    // Projects only in DeFiLlama: fundamentals only (no market → V will be weak, correct).
    const allSymbols = new Set([...marketBySymbol.keys(), ...fundamentalsBySymbol.keys()]);
    const inputs: ReturnType<typeof toProjectInput>[] = [];

    for (const symbol of allSymbols) {
      const mkt = marketBySymbol.get(symbol);
      const fund = fundamentalsBySymbol.get(symbol);

      if (mkt && fund) {
        // Both sources — full data
        inputs.push(toProjectInput(mkt, fund));
      } else if (mkt) {
        // CoinGecko only — market data, no fundamentals
        inputs.push(toProjectInput(mkt));
      } else if (fund) {
        // DeFiLlama only — fundamentals, no market data
        // Create a minimal MarketDataRow from fundamentals
        const m: MarketDataRow = {
          symbol: fund.symbol,
          name: fund.name,
          sector: fund.sector,
          chain: fund.chain,
        };
        inputs.push(toProjectInput(m, fund));
      }
    }

    const live = inputs.length > 0;

    if (live) {
      universeCache = { inputs, live, sourcesUsed, timestamp: Date.now() };
      return { inputs, live, sourcesUsed };
    }
  }

  // ── Fallback: bundled dataset when APIs unreachable ──
  const bundle = getBundleUniverse();
  const inputs = bundle.map(({ market, fundamentals }) =>
    toProjectInput(market, fundamentals)
  );
  return { inputs, live: false, sourcesUsed: ["bundle"] };
}
