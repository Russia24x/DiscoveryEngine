// Price chart engine — generates deterministic OHLC + volume + technical indicators.
// In production these would come from a live price API (CoinGecko /charts endpoint).
// Here we synthesize a realistic 90-day series seeded by the symbol so the chart
// is stable per project and reflects the priceChange90d signal.
import type { ProjectInput } from "./types";

export interface PricePoint {
  t: number; // timestamp (day index 0..89)
  date: string; // ISO date
  price: number;
  volume: number;
  ma7: number; // 7-day moving average
  ma30: number; // 30-day moving average
  rsi: number; // 14-day RSI
  change: number; // % change from previous day
}

export interface PriceSeries {
  points: PricePoint[];
  current: number;
  high90: number;
  low90: number;
  avgVolume: number;
  totalChange90d: number;
  volatility: number;
  support: number;
  resistance: number;
  trend: "bullish" | "bearish" | "sideways";
  indicators: {
    rsi: number;
    rsiSignal: "oversold" | "oversold-leaning" | "neutral" | "overbought-leaning" | "overbought";
    maCross: "golden" | "death" | "none";
    momentum: number;
  };
}

export function generatePriceSeries(input: ProjectInput): PriceSeries {
  const seed = hashStr(input.symbol);
  const rng = mulberry32(seed);
  const startPrice = (input.priceUsd ?? 10) / (1 + (input.priceChange90d ?? 0) / 100);
  const targetPrice = input.priceUsd ?? startPrice * 1.1;
  const days = 90;

  // Generate daily prices with a random-walk biased toward the target.
  const prices: number[] = [];
  let p = startPrice;
  for (let i = 0; i < days; i++) {
    const progress = i / (days - 1);
    const drift = (targetPrice - startPrice) / days;
    const noise = (rng() - 0.5) * p * 0.04; // 4% daily volatility
    p = Math.max(0.01, p + drift + noise);
    prices.push(p);
  }
  // Ensure last point equals current price
  prices[days - 1] = input.priceUsd ?? prices[days - 1];

  // Volume — synthetic, higher on big move days
  const volumes: number[] = prices.map((_, i) => {
    const base = (input.marketCap ?? 1e9) * 0.05;
    const change = i > 0 ? Math.abs(prices[i] - prices[i - 1]) / prices[i - 1] : 0;
    return base * (0.5 + rng() * 0.5 + change * 8);
  });

  // Moving averages
  function ma(arr: number[], period: number, idx: number): number {
    if (idx < period - 1) return arr[idx];
    let sum = 0;
    for (let i = idx - period + 1; i <= idx; i++) sum += arr[i];
    return sum / period;
  }

  // RSI (14-day)
  function rsi(arr: number[], idx: number): number {
    if (idx < 14) return 50;
    let gains = 0;
    let losses = 0;
    for (let i = idx - 13; i <= idx; i++) {
      const diff = arr[i] - arr[i - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }
    const avgGain = gains / 14;
    const avgLoss = losses / 14;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  const now = Date.now();
  const points: PricePoint[] = prices.map((price, i) => ({
    t: i,
    date: new Date(now - (days - 1 - i) * 86400000).toISOString(),
    price,
    volume: volumes[i],
    ma7: ma(prices, 7, i),
    ma30: ma(prices, 30, i),
    rsi: rsi(prices, i),
    change: i > 0 ? ((price - prices[i - 1]) / prices[i - 1]) * 100 : 0,
  }));

  const current = prices[prices.length - 1];
  const high90 = Math.max(...prices);
  const low90 = Math.min(...prices);
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const totalChange90d = ((current - prices[0]) / prices[0]) * 100;
  const returns = prices.slice(1).map((v, i) => (v - prices[i]) / prices[i]);
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - meanReturn) ** 2, 0) / returns.length;
  const volatility = Math.sqrt(variance) * Math.sqrt(365) * 100; // annualized %

  // Support/resistance from recent 30 days
  const recent = prices.slice(-30);
  const support = Math.min(...recent);
  const resistance = Math.max(...recent);

  const trend: PriceSeries["trend"] =
    totalChange90d > 8 ? "bullish" : totalChange90d < -8 ? "bearish" : "sideways";

  const lastRsi = points[points.length - 1].rsi;
  const rsiSignal: PriceSeries["indicators"]["rsiSignal"] =
    lastRsi < 30 ? "oversold" : lastRsi < 40 ? "oversold-leaning" : lastRsi <= 60 ? "neutral" : lastRsi <= 70 ? "overbought-leaning" : "overbought";

  const lastMa7 = points[points.length - 1].ma7;
  const lastMa30 = points[points.length - 1].ma30;
  const maCross: PriceSeries["indicators"]["maCross"] =
    lastMa7 > lastMa30 ? "golden" : lastMa7 < lastMa30 ? "death" : "none";

  const momentum = ((current - prices[Math.max(0, prices.length - 10)]) / prices[Math.max(0, prices.length - 10)]) * 100;

  return {
    points,
    current,
    high90,
    low90,
    avgVolume,
    totalChange90d,
    volatility,
    support,
    resistance,
    trend,
    indicators: { rsi: lastRsi, rsiSignal, maCross, momentum },
  };
}

// ── Helpers ──
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
