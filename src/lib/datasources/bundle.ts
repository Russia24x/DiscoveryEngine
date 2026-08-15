// Bundled representative dataset — realistic figures for the engine to rank immediately.
// Used as a fallback when outbound APIs are unreachable (e.g. sandbox), and as the
// deterministic seed universe for the scanner. Figures are illustrative annual USD values
// aligned with the framework's sample projects (HYPE, AAVE, SKY) plus major protocols.
//
// IMPORTANT (per FRAMEWORK.md §16): these are SAMPLE numbers, not audited live data.
// The engine architecture is real; replace bundle rows with live adapter output in production.
import type { FundamentalsRow, MarketDataRow } from "./types";

export const BUNDLE_MARKET: MarketDataRow[] = [
  { symbol: "HYPE", name: "Hyperliquid", priceUsd: 24.8, marketCap: 8.2e9, fdv: 24.8e9, totalSupply: 1e9, floatSupply: 330e6, sector: "Perp DEX", chain: "Hyperliquid", priceChange90d: 38 },
  { symbol: "AAVE", name: "Aave", priceUsd: 312, marketCap: 4.7e9, fdv: 4.9e9, totalSupply: 16e6, floatSupply: 15e6, sector: "Lending", chain: "Ethereum", priceChange90d: 12 },
  { symbol: "SKY", name: "Sky", priceUsd: 0.082, marketCap: 1.6e9, fdv: 8.2e9, totalSupply: 100e9, floatSupply: 19.5e9, sector: "Stablecoin", chain: "Ethereum", priceChange90d: -4 },
  { symbol: "UNI", name: "Uniswap", priceUsd: 11.4, marketCap: 6.8e9, fdv: 11.4e9, totalSupply: 1e9, floatSupply: 600e6, sector: "DEX", chain: "Ethereum", priceChange90d: 7 },
  { symbol: "LDO", name: "Lido DAO", priceUsd: 1.62, marketCap: 1.4e9, fdv: 1.62e9, totalSupply: 1e9, floatSupply: 870e6, sector: "Liquid Staking", chain: "Ethereum", priceChange90d: -8 },
  { symbol: "GMX", name: "GMX", priceUsd: 28.5, marketCap: 280e6, fdv: 285e6, totalSupply: 10e6, floatSupply: 9.85e6, sector: "Perp DEX", chain: "Arbitrum", priceChange90d: 3 },
  { symbol: "PENDLE", name: "Pendle", priceUsd: 4.1, marketCap: 670e6, fdv: 820e6, totalSupply: 200e6, floatSupply: 164e6, sector: "Yield", chain: "Ethereum", priceChange90d: 22 },
  { symbol: "CRV", name: "Curve", priceUsd: 0.42, marketCap: 530e6, fdv: 1.6e9, totalSupply: 3.8e9, floatSupply: 1.26e9, sector: "DEX", chain: "Ethereum", priceChange90d: -2 },
  { symbol: "COMP", name: "Compound", priceUsd: 58, marketCap: 460e6, fdv: 580e6, totalSupply: 10e6, floatSupply: 7.9e6, sector: "Lending", chain: "Ethereum", priceChange90d: 5 },
  { symbol: "MKR", name: "Maker", priceUsd: 1340, marketCap: 1.1e9, fdv: 1.34e9, totalSupply: 1e6, floatSupply: 820e3, sector: "CDP", chain: "Ethereum", priceChange90d: -6 },
  { symbol: "DYDX", name: "dYdX", priceUsd: 1.12, marketCap: 470e6, fdv: 1.12e9, totalSupply: 1e9, floatSupply: 420e6, sector: "Perp DEX", chain: "dYdX Chain", priceChange90d: -15 },
  { symbol: "INJ", name: "Injective", priceUsd: 21, marketCap: 2.0e9, fdv: 2.1e9, totalSupply: 100e6, floatSupply: 96e6, sector: "DeFi Chain", chain: "Injective", priceChange90d: 9 },
  { symbol: "JUP", name: "Jupiter", priceUsd: 0.78, marketCap: 1.1e9, fdv: 7.8e9, totalSupply: 10e9, floatSupply: 1.35e9, sector: "DEX Aggregator", chain: "Solana", priceChange90d: 14 },
  { symbol: "JTO", name: "Jito", priceUsd: 2.4, marketCap: 690e6, fdv: 2.4e9, totalSupply: 1e9, floatSupply: 290e6, sector: "Liquid Staking", chain: "Solana", priceChange90d: 11 },
  { symbol: "ENA", name: "Ethena", priceUsd: 0.95, marketCap: 2.6e9, fdv: 13e9, totalSupply: 15e9, floatSupply: 2.7e9, sector: "Synthetic Dollar", chain: "Ethereum", priceChange90d: 18 },
  { symbol: "SUSHI", name: "SushiSwap", priceUsd: 0.92, marketCap: 190e6, fdv: 276e6, totalSupply: 300e6, floatSupply: 206e6, sector: "DEX", chain: "Ethereum", priceChange90d: 2 },
  { symbol: "SNX", name: "Synthetix", priceUsd: 1.85, marketCap: 470e6, fdv: 1.85e9, totalSupply: 1e9, floatSupply: 254e6, sector: "Derivatives", chain: "Ethereum", priceChange90d: -5 },
  { symbol: "RUNE", name: "THORChain", priceUsd: 4.8, marketCap: 1.6e9, fdv: 4.8e9, totalSupply: 1e9, floatSupply: 335e6, sector: "Cross-chain DEX", chain: "THORChain", priceChange90d: 6 },
  { symbol: "FET", name: "Artificial Superintelligence", priceUsd: 1.1, marketCap: 2.5e9, fdv: 2.6e9, totalSupply: 2.7e9, floatSupply: 2.3e9, sector: "AI", chain: "Ethereum", priceChange90d: 19 },
  { symbol: "ONDO", name: "Ondo", priceUsd: 0.88, marketCap: 1.3e9, fdv: 8.8e9, totalSupply: 10e9, floatSupply: 1.5e9, sector: "RWA", chain: "Ethereum", priceChange90d: 16 },
  { symbol: "AERO", name: "Aerodrome", priceUsd: 1.35, marketCap: 920e6, fdv: 1.9e9, totalSupply: 1.4e9, floatSupply: 680e6, sector: "DEX", chain: "Base", priceChange90d: 10 },
  { symbol: "SEI", name: "Sei", priceUsd: 0.42, marketCap: 1.5e9, fdv: 4.2e9, totalSupply: 10e9, floatSupply: 3.6e9, sector: "DeFi Chain", chain: "Sei", priceChange90d: -3 },
];

export const BUNDLE_FUNDAMENTALS: FundamentalsRow[] = [
  { symbol: "HYPE", tvl: 4.2e9, feesAnnual: 560e6, revenueAnnual: 560e6, protocolCapture: 560e6, tokenholderCapture: 180e6, buybackBurnAnnual: 180e6, unlockEmission12m: 30e6, revenueGrowth90d: 41, userGrowth: 22 },
  { symbol: "AAVE", tvl: 13.5e9, feesAnnual: 320e6, revenueAnnual: 320e6, protocolCapture: 320e6, tokenholderCapture: 95e6, buybackBurnAnnual: 0, unlockEmission12m: 28e6, revenueGrowth90d: 33, userGrowth: 14 },
  { symbol: "SKY", tvl: 8.1e9, feesAnnual: 210e6, revenueAnnual: 210e6, protocolCapture: 210e6, tokenholderCapture: 48e6, buybackBurnAnnual: 40e6, unlockEmission12m: 1.2e9, revenueGrowth90d: 6, userGrowth: 3 },
  { symbol: "UNI", tvl: 6.1e9, feesAnnual: 900e6, revenueAnnual: 900e6, protocolCapture: 0, tokenholderCapture: 0, buybackBurnAnnual: 0, unlockEmission12m: 120e6, revenueGrowth90d: 18, userGrowth: 9 },
  { symbol: "LDO", tvl: 24e9, feesAnnual: 140e6, revenueAnnual: 140e6, protocolCapture: 140e6, tokenholderCapture: 35e6, buybackBurnAnnual: 0, unlockEmission12m: 90e6, revenueGrowth90d: -2, userGrowth: 1 },
  { symbol: "GMX", tvl: 580e6, feesAnnual: 130e6, revenueAnnual: 130e6, protocolCapture: 130e6, tokenholderCapture: 95e6, buybackBurnAnnual: 0, unlockEmission12m: 8e6, revenueGrowth90d: 8, userGrowth: 5 },
  { symbol: "PENDLE", tvl: 6.5e9, feesAnnual: 80e6, revenueAnnual: 80e6, protocolCapture: 80e6, tokenholderCapture: 30e6, buybackBurnAnnual: 0, unlockEmission12m: 25e6, revenueGrowth90d: 45, userGrowth: 28 },
  { symbol: "CRV", tvl: 1.9e9, feesAnnual: 90e6, revenueAnnual: 90e6, protocolCapture: 90e6, tokenholderCapture: 22e6, buybackBurnAnnual: 0, unlockEmission12m: 180e6, revenueGrowth90d: -6, userGrowth: -2 },
  { symbol: "COMP", tvl: 2.8e9, feesAnnual: 70e6, revenueAnnual: 70e6, protocolCapture: 70e6, tokenholderCapture: 18e6, buybackBurnAnnual: 0, unlockEmission12m: 12e6, revenueGrowth90d: 11, userGrowth: 7 },
  { symbol: "MKR", tvl: 6.0e9, feesAnnual: 240e6, revenueAnnual: 240e6, protocolCapture: 240e6, tokenholderCapture: 120e6, buybackBurnAnnual: 90e6, unlockEmission12m: 5e3 * 1340, revenueGrowth90d: 4, userGrowth: 2 },
  { symbol: "DYDX", tvl: 320e6, feesAnnual: 60e6, revenueAnnual: 60e6, protocolCapture: 60e6, tokenholderCapture: 30e6, buybackBurnAnnual: 0, unlockEmission12m: 150e6, revenueGrowth90d: -12, userGrowth: -5 },
  { symbol: "INJ", tvl: 1.1e9, feesAnnual: 40e6, revenueAnnual: 40e6, protocolCapture: 40e6, tokenholderCapture: 12e6, buybackBurnAnnual: 8e6, unlockEmission12m: 25e6, revenueGrowth90d: 9, userGrowth: 6 },
  { symbol: "JUP", tvl: 1.4e9, feesAnnual: 220e6, revenueAnnual: 220e6, protocolCapture: 220e6, tokenholderCapture: 0, buybackBurnAnnual: 0, unlockEmission12m: 200e6, revenueGrowth90d: 16, userGrowth: 12 },
  { symbol: "JTO", tvl: 2.2e9, feesAnnual: 90e6, revenueAnnual: 90e6, protocolCapture: 90e6, tokenholderCapture: 28e6, buybackBurnAnnual: 0, unlockEmission12m: 110e6, revenueGrowth90d: 13, userGrowth: 8 },
  { symbol: "ENA", tvl: 3.0e9, feesAnnual: 180e6, revenueAnnual: 180e6, protocolCapture: 180e6, tokenholderCapture: 60e6, buybackBurnAnnual: 0, unlockEmission12m: 1.5e9, revenueGrowth90d: 24, userGrowth: 18 },
  { symbol: "SUSHI", tvl: 220e6, feesAnnual: 35e6, revenueAnnual: 35e6, protocolCapture: 35e6, tokenholderCapture: 8e6, buybackBurnAnnual: 0, unlockEmission12m: 30e6, revenueGrowth90d: 3, userGrowth: 1 },
  { symbol: "SNX", tvl: 580e6, feesAnnual: 50e6, revenueAnnual: 50e6, protocolCapture: 50e6, tokenholderCapture: 14e6, buybackBurnAnnual: 0, unlockEmission12m: 60e6, revenueGrowth90d: -4, userGrowth: 0 },
  { symbol: "RUNE", tvl: 1.6e9, feesAnnual: 110e6, revenueAnnual: 110e6, protocolCapture: 110e6, tokenholderCapture: 50e6, buybackBurnAnnual: 0, unlockEmission12m: 90e6, revenueGrowth90d: 7, userGrowth: 4 },
  { symbol: "FET", tvl: 90e6, feesAnnual: 8e6, revenueAnnual: 8e6, protocolCapture: 8e6, tokenholderCapture: 2e6, buybackBurnAnnual: 0, unlockEmission12m: 60e6, revenueGrowth90d: 21, userGrowth: 15 },
  { symbol: "ONDO", tvl: 600e6, feesAnnual: 22e6, revenueAnnual: 22e6, protocolCapture: 22e6, tokenholderCapture: 6e6, buybackBurnAnnual: 0, unlockEmission12m: 400e6, revenueGrowth90d: 19, userGrowth: 14 },
  { symbol: "AERO", tvl: 1.5e9, feesAnnual: 140e6, revenueAnnual: 140e6, protocolCapture: 140e6, tokenholderCapture: 70e6, buybackBurnAnnual: 0, unlockEmission12m: 220e6, revenueGrowth90d: 15, userGrowth: 11 },
  { symbol: "SEI", tvl: 480e6, feesAnnual: 18e6, revenueAnnual: 18e6, protocolCapture: 18e6, tokenholderCapture: 5e6, buybackBurnAnnual: 0, unlockEmission12m: 300e6, revenueGrowth90d: -3, userGrowth: 2 },
];

export function getBundleUniverse() {
  const fundBySymbol = new Map(BUNDLE_FUNDAMENTALS.map((f) => [f.symbol, f]));
  return BUNDLE_MARKET.map((m) => ({ market: m, fundamentals: fundBySymbol.get(m.symbol) }));
}
