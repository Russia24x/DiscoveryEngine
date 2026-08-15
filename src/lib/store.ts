"use client";

import { create } from "zustand";

export type View =
  | "dashboard"
  | "scanner"
  | "project"
  | "compare"
  | "heatmap"
  | "portfolio"
  | "alerts"
  | "sources"
  | "news"
  | "settings"
  | "framework";

interface RankedResult {
  symbol: string;
  name: string;
  sector?: string;
  chain?: string;
  logoUrl?: string;
  priceUsd?: number;
  marketCap?: number;
  fdv?: number;
  components: { pq: number | null; tq: number | null; va: number | null; v: number | null; r: number | null };
  vae: { vae: number | null; alpha: number | null; delta: number | null };
  supply: { sar: number | null; fdr: number | null };
  iaRaw: number | null;
  confidence: number | null;
  iaEffective: number | null;
  marketRegime: number | null;
  iaFinal: number | null;
  gates: any[];
  gatePassed: boolean;
  decision: string;
  decisionExplanation: { for: string[]; against: string[]; triggers: string[] };
  fundamentalRank: number;
  confidenceRank: number;
  effectiveRank: number;
  marketRank: number;
  thesis: any;
  peer: any;
  relativeAttractiveness: number | null;
}

interface AppState {
  view: View;
  selectedSymbol: string | null;
  scanResults: RankedResult[] | null;
  scanMeta: {
    live: boolean;
    sourcesUsed: string[];
    marketRegime: number;
    universeSize: number;
    passed: number;
    rejected: number;
    investigate: number;
  } | null;
  scanning: boolean;

  setView: (v: View) => void;
  openProject: (symbol: string) => void;
  setScanResults: (r: RankedResult[] | null) => void;
  setScanMeta: (m: AppState["scanMeta"]) => void;
  setScanning: (s: boolean) => void;
}

export const useApp = create<AppState>((set) => ({
  view: "dashboard",
  selectedSymbol: null,
  scanResults: null,
  scanMeta: null,
  scanning: false,
  setView: (v) => set({ view: v }),
  openProject: (symbol) => set({ selectedSymbol: symbol, view: "project" }),
  setScanResults: (r) => set({ scanResults: r }),
  setScanMeta: (m) => set({ scanMeta: m }),
  setScanning: (s) => set({ scanning: s }),
}));

export type { RankedResult };
