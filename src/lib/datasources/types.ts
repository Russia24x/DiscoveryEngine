// Pluggable data source adapters.
// Free adapters (CoinGecko, DeFiLlama, Binance) work without keys today.
// Key-based adapters (CMC, Messari, Nansen) share the same interface for the future.
import type { ProjectInput } from "@/lib/engine/types";

export interface MarketDataRow {
  symbol: string;
  name?: string;
  priceUsd?: number;
  marketCap?: number;
  fdv?: number;
  totalSupply?: number;
  floatSupply?: number;
  logoUrl?: string;
  sector?: string;
  chain?: string;
  priceChange90d?: number;
}

export interface FundamentalsRow {
  symbol: string;
  tvl?: number;
  feesAnnual?: number; // GEA / fees
  revenueAnnual?: number; // PR
  protocolCapture?: number; // PC
  tokenholderCapture?: number; // TC
  buybackBurnAnnual?: number;
  unlockEmission12m?: number;
  revenueGrowth90d?: number;
  userGrowth?: number;
}

export interface DataSourceAdapter {
  key: string;
  name: string;
  type: "free" | "apikey";
  requiresKey: boolean;
  endpoint: string;
  coverage: string;
  fetchMarketData(symbols?: string[], apiKey?: string): Promise<MarketDataRow[]>;
  fetchFundamentals(symbols?: string[], apiKey?: string): Promise<FundamentalsRow[]>;
}

// Merge market + fundamentals into engine ProjectInput.
export function toProjectInput(m: MarketDataRow, f?: FundamentalsRow): ProjectInput {
  const priceChange90d = m.priceChange90d ?? 0;
  // Derive heuristic component scores (0-100) from real data where possible.
  // These are first-pass estimates; confidence reflects data completeness.
  const revenueGrowth = f?.revenueGrowth90d ?? clampPct(priceChange90d + 10);

  return {
    symbol: m.symbol,
    name: m.name ?? m.symbol,
    sector: m.sector,
    chain: m.chain,
    logoUrl: m.logoUrl,
    priceUsd: m.priceUsd,
    marketCap: m.marketCap,
    fdv: m.fdv,
    totalSupply: m.totalSupply,
    floatSupply: m.floatSupply,
    priceChange90d: m.priceChange90d,
    gea: f?.feesAnnual,
    pr: f?.revenueAnnual ?? f?.feesAnnual,
    pc: f?.protocolCapture,
    tc: f?.tokenholderCapture,
    buybackBurnAnnual: f?.buybackBurnAnnual,
    unlockEmission12m: f?.unlockEmission12m,
    revenueGrowth,
    userGrowth: f?.userGrowth ?? clampPct(priceChange90d + 5),
    // Heuristic estimates (lower confidence) for components free APIs can't give directly
    revenueStability: 55,
    revenueDiversification: 50,
    marketPosition: 55,
    tokenUtility: 50,
    governanceQuality: 50,
    vaeTrend: 50,
    buybackActivity: f?.buybackBurnAnnual ? 60 : 30,
    tokenYield: 35,
    incentiveGravity: 50,
    revenueConcentration: 55,
    insiderConcentration: 55,
    regulatory: 45,
    smartContract: 40,
    marketLiquidity: 55,
    dependency: 45,
    dataCompleteness: 0, // recomputed downstream
    sourceQuality: 60,
    modelStability: 70,
    buybackThesis: (f?.buybackBurnAnnual ?? 0) > 0,
  };
}

function clampPct(x: number): number {
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(100, x));
}
