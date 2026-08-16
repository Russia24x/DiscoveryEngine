// DeFiLlama free adapter (completely free, no key, no rate limit issues).
// Docs: https://defillama.com/docs/api
// The /overview/fees endpoint returns ALL protocols with annualized fee data.
// Revenue breakdown (PR, TC) is not available from this endpoint — only total fees (GEA).
// Projects with unknown TC get VAE=null (unknown, not 0) — the engine handles this
// by lowering confidence rather than auto-rejecting.
import type { DataSourceAdapter, FundamentalsRow, MarketDataRow } from "./types";
import { fetchWithTimeout } from "./fetch-utils";

const BASE = "https://api.llama.fi";

interface LlamaProtocol {
  id?: string;
  name?: string;
  displayName?: string;
  slug?: string;
  category?: string;
  chains?: string[];
  logo?: string;
  // Fee fields (new structure)
  total24h?: number;
  total7d?: number;
  total30d?: number;
  total1y?: number;
  annualized1y?: number;
  // Change fields
  change_1d?: number;
  change_7d?: number;
  change_1m?: number;
  // Methodology
  methodology?: {
    Fees?: string;
    Revenue?: string;
    ProtocolRevenue?: string;
  };
}

export const defillama: DataSourceAdapter = {
  key: "defillama",
  name: "DeFiLlama",
  type: "free",
  requiresKey: false,
  endpoint: BASE,
  coverage: "Fees (annualized), TVL, Protocol metadata, Category, Chains",

  async fetchMarketData(_symbols?: string[], _apiKey?: string): Promise<MarketDataRow[]> {
    return [];
  },

  async fetchFundamentals(_symbols?: string[], _apiKey?: string): Promise<FundamentalsRow[]> {
    try {
      const res = await fetchWithTimeout(`${BASE}/overview/fees`, {
        headers: { accept: "application/json" },
        next: { revalidate: 120 },
      });
      if (!res.ok) throw new Error(`DeFiLlama fees ${res.status}`);
      const data = (await res.json()) as { protocols?: Record<string, LlamaProtocol> };
      const protocols = data.protocols ?? {};

      return Object.values(protocols)
        .filter((p) => p.name || p.displayName)
        .filter((p) => {
          // Only include protocols with meaningful fee data.
          const annual = p.annualized1y ?? p.total1y ?? 0;
          return annual > 0;
        })
        .map((p) => {
          // Use annualized1y as the primary annual figure (GEA = total fees).
          const annualFees = p.annualized1y ?? p.total1y ?? 0;
          const fees24h = p.total24h ?? 0;

          // PR = protocol revenue. Without a separate revenue endpoint,
          // we assume all fees are revenue (true for many protocols).
          // The methodology field sometimes confirms this.
          const isAllFeesRevenue = p.methodology?.Revenue?.toLowerCase().includes("all fees are revenue") ?? false;
          const pr = isAllFeesRevenue ? annualFees : annualFees; // default: PR = GEA

          // TC = tokenholder capture. Not available from this endpoint.
          // Set to undefined (not 0) so VAE = null (unknown), not 0.
          // The engine treats null VAE as "unknown" — lowers confidence, doesn't auto-reject.
          const tc = undefined;

          // Derive 90d growth from change fields if available.
          const revenueGrowth90d = p.change_1m != null ? p.change_1m : undefined;

          return {
            symbol: (p.displayName ?? p.name ?? p.slug ?? "").toUpperCase(),
            name: p.displayName ?? p.name,
            tvl: undefined, // TVL not available from fees endpoint
            feesAnnual: annualFees,
            revenueAnnual: pr,
            protocolCapture: pr,
            tokenholderCapture: tc,
            revenueGrowth90d,
            sector: p.category,
            chain: p.chains?.[0],
            geckoId: p.slug,
          };
        });
    } catch (e) {
      console.error("[defillama] fetch failed:", e);
      return [];
    }
  },
};
