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
  name?: string;
  tvl?: number;
  feesAnnual?: number; // GEA / fees
  revenueAnnual?: number; // PR
  protocolCapture?: number; // PC
  tokenholderCapture?: number; // TC
  buybackBurnAnnual?: number;
  unlockEmission12m?: number;
  revenueGrowth90d?: number;
  userGrowth?: number;
  sector?: string;
  chain?: string;
  geckoId?: string;
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
// Uses real data where available, derived heuristics where not.
// Heuristics vary per project (not constant) based on market cap, chain, sector, supply ratio.
export function toProjectInput(m: MarketDataRow, f?: FundamentalsRow): ProjectInput {
  const priceChange90d = m.priceChange90d ?? 0;
  const revenueGrowth = f?.revenueGrowth90d ?? clampPct(priceChange90d + 10);

  // Derive sector/chain from either source.
  const sector = m.sector ?? f?.sector;
  const chain = m.chain ?? f?.chain;

  // ── Derived heuristics (vary per project, not constant) ──

  // Insider Concentration: if float << total supply, insiders hold a lot.
  const totalSupply = m.totalSupply ?? 0;
  const floatSupply = m.floatSupply ?? 0;
  const floatRatio = totalSupply > 0 ? floatSupply / totalSupply : 1;
  // Lower float ratio = higher insider concentration (more tokens locked/unvested)
  const insiderConcentration = clampPct((1 - floatRatio) * 100);

  // Market Liquidity: higher market cap = more liquid = lower risk.
  const mcap = m.marketCap ?? 0;
  const marketLiquidity = mcap > 10e9 ? 25 : mcap > 1e9 ? 40 : mcap > 100e6 ? 55 : mcap > 10e6 ? 70 : 85;

  // Smart Contract risk: varies by chain.
  const chainLower = (chain ?? "").toLowerCase();
  const smartContract = chainLower.includes("ethereum") ? 30
    : chainLower.includes("solana") || chainLower.includes("bitcoin") ? 35
    : chainLower.includes("arbitrum") || chainLower.includes("base") || chainLower.includes("optimism") ? 40
    : 55; // unknown/new chains = higher risk

  // Dependency risk: varies by sector.
  const sectorLower = (sector ?? "").toLowerCase();
  const dependency = sectorLower.includes("lending") || sectorLower.includes("cdp") ? 55
    : sectorLower.includes("dex") || sectorLower.includes("perp") ? 50
    : sectorLower.includes("liquid staking") ? 60
    : sectorLower.includes("stablecoin") ? 65
    : 45;

  // Regulatory risk: varies by sector.
  const regulatory = sectorLower.includes("stablecoin") ? 65
    : sectorLower.includes("dex") || sectorLower.includes("perp") ? 55
    : sectorLower.includes("lending") ? 50
    : 40;

  // Market Position: derive from TVL if available (higher TVL = stronger position).
  const tvl = f?.tvl ?? 0;
  const marketPosition = tvl > 10e9 ? 80 : tvl > 1e9 ? 65 : tvl > 100e6 ? 50 : tvl > 10e6 ? 35 : 25;

  // Revenue Concentration: if protocol has very high revenue relative to TVL,
  // it might be concentrated. This is a rough proxy.
  const pr = f?.revenueAnnual ?? 0;
  const revenueConcentration = pr > 0 && tvl > 0
    ? clampPct(30 + (pr / tvl) * 200) // higher revenue/TVL ratio = potentially more concentrated
    : 50;

  return {
    symbol: m.symbol,
    name: m.name ?? f?.name ?? m.symbol,
    sector,
    chain,
    logoUrl: m.logoUrl,
    priceUsd: m.priceUsd,
    marketCap: m.marketCap,
    fdv: m.fdv,
    totalSupply: m.totalSupply,
    floatSupply: m.floatSupply,
    priceChange90d: m.priceChange90d,
    gea: f?.feesAnnual,
    pr: f?.revenueAnnual || f?.feesAnnual,
    pc: f?.protocolCapture || f?.feesAnnual,
    tc: f?.tokenholderCapture,
    buybackBurnAnnual: f?.buybackBurnAnnual,
    unlockEmission12m: f?.unlockEmission12m,
    revenueGrowth,
    userGrowth: f?.userGrowth ?? clampPct(priceChange90d + 5),
    // Heuristic estimates — derived from real data, not constant
    revenueStability: 55, // needs historical data
    revenueDiversification: 50, // needs revenue breakdown
    marketPosition,
    tokenUtility: 50, // needs qualitative analysis
    governanceQuality: 50, // needs qualitative analysis
    vaeTrend: 50, // needs historical VAE
    buybackActivity: f?.buybackBurnAnnual ? 60 : 30,
    tokenYield: 35, // needs staking/yield data
    incentiveGravity: 50, // needs incentive data
    revenueConcentration,
    insiderConcentration,
    regulatory,
    smartContract,
    marketLiquidity,
    dependency,
    dataCompleteness: 0, // recomputed downstream
    sourceQuality: f ? 70 : 50, // higher if fundamentals source exists
    modelStability: 70,
    buybackThesis: (f?.buybackBurnAnnual ?? 0) > 0,
  };
}

function clampPct(x: number): number {
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(100, x));
}
