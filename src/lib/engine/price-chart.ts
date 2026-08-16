// Price chart engine — fetches real OHLC data from Binance klines API.
// Binance provides free, no-key, daily candles for any USDT pair.
// If Binance doesn't have the pair, no chart is shown (no synthetic fallback).
import { fetchWithTimeout } from "@/lib/datasources/fetch-utils";

export interface PricePoint {
  t: number;
  date: string;
  price: number;
  volume: number;
  ma7: number;
  ma30: number;
  rsi: number;
  change: number;
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
  real: boolean; // always true — only real data, no synthetic
}

// Fetch real daily klines from Binance for the given symbol.
// Returns null if Binance doesn't have the pair.
export async function fetchRealPriceSeries(symbol: string): Promise<PriceSeries | null> {
  try {
    const pair = `${symbol.toUpperCase()}USDT`;
    const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1d&limit=90`;
    const res = await fetchWithTimeout(url, { next: { revalidate: 300 } }, 8000);
    if (!res.ok) return null;
    const raw = (await res.json()) as any[];
    if (!Array.isArray(raw) || raw.length < 14) return null;

    // Binance kline format: [openTime, open, high, low, close, volume, closeTime, ...]
    const prices: number[] = raw.map((k) => parseFloat(k[4])); // close price
    const volumes: number[] = raw.map((k) => parseFloat(k[5]));
    const dates: string[] = raw.map((k) => new Date(parseInt(k[0])).toISOString());

    return buildSeries(prices, volumes, dates, true);
  } catch {
    return null;
  }
}

// Build PriceSeries from raw price/volume/date arrays.
function buildSeries(prices: number[], volumes: number[], dates: string[], real: boolean): PriceSeries {
  function ma(arr: number[], period: number, idx: number): number {
    if (idx < period - 1) return arr[idx];
    let sum = 0;
    for (let i = idx - period + 1; i <= idx; i++) sum += arr[i];
    return sum / period;
  }

  function rsi(arr: number[], idx: number): number {
    if (idx < 14) return 50;
    let gains = 0, losses = 0;
    for (let i = idx - 13; i <= idx; i++) {
      const diff = arr[i] - arr[i - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }
    if (losses === 0) return 100;
    return 100 - 100 / (1 + gains / losses);
  }

  const points: PricePoint[] = prices.map((price, i) => ({
    t: i,
    date: dates[i],
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
  const volatility = Math.sqrt(variance) * Math.sqrt(365) * 100;

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
    points, current, high90, low90, avgVolume, totalChange90d, volatility,
    support, resistance, trend,
    indicators: { rsi: lastRsi, rsiSignal, maCross, momentum },
    real,
  };
}
