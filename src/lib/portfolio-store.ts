"use client";

import { create } from "zustand";

export interface Position {
  id: string;
  symbol: string;
  name: string;
  logoUrl?: string;
  entryPrice: number; // USD per token at entry
  quantity: number; // tokens held
  entryDate: string; // ISO date
  notes?: string;
}

interface PortfolioState {
  positions: Position[];
  loaded: boolean;
  add: (pos: Omit<Position, "id">) => void;
  remove: (id: string) => void;
  update: (id: string, patch: Partial<Position>) => void;
  load: () => void;
}

const STORAGE_KEY = "cryptosieve.portfolio";

function loadFromStorage(): Position[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Position[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(positions: Position[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {}
}

function genId(): string {
  return `pos_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const usePortfolio = create<PortfolioState>((set, get) => ({
  positions: [],
  loaded: false,
  load: () => {
    if (get().loaded) return;
    set({ positions: loadFromStorage(), loaded: true });
  },
  add: (pos) => {
    const next = [...get().positions, { ...pos, id: genId() }];
    saveToStorage(next);
    set({ positions: next });
  },
  remove: (id) => {
    const next = get().positions.filter((p) => p.id !== id);
    saveToStorage(next);
    set({ positions: next });
  },
  update: (id, patch) => {
    const next = get().positions.map((p) => (p.id === id ? { ...p, ...patch } : p));
    saveToStorage(next);
    set({ positions: next });
  },
}));

// Computed P&L for a position given current price.
export function computePnl(pos: Position, currentPrice?: number): {
  costBasis: number;
  currentValue: number;
  pnl: number;
  pnlPct: number;
} {
  const costBasis = pos.entryPrice * pos.quantity;
  const currentValue = (currentPrice ?? pos.entryPrice) * pos.quantity;
  const pnl = currentValue - costBasis;
  const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
  return { costBasis, currentValue, pnl, pnlPct };
}
