"use client";

import { create } from "zustand";

export interface WatchlistItem {
  symbol: string;
  name: string;
  sector?: string;
  logoUrl?: string;
  addedAt: number;
  // Optional alert thresholds
  targetPriceUp?: number; // alert when IA_final rises above this
  targetPriceDown?: number; // alert when IA_final drops below this
  notes?: string;
}

interface WatchlistState {
  items: WatchlistItem[];
  loaded: boolean;
  add: (item: Omit<WatchlistItem, "addedAt">) => void;
  remove: (symbol: string) => void;
  update: (symbol: string, patch: Partial<WatchlistItem>) => void;
  has: (symbol: string) => boolean;
  load: () => void;
}

const STORAGE_KEY = "cryptosieve.watchlist";

function loadFromStorage(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WatchlistItem[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: WatchlistItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export const useWatchlist = create<WatchlistState>((set, get) => ({
  items: [],
  loaded: false,
  load: () => {
    if (get().loaded) return;
    set({ items: loadFromStorage(), loaded: true });
  },
  add: (item) => {
    const items = get().items;
    if (items.some((i) => i.symbol === item.symbol)) return;
    const next = [...items, { ...item, addedAt: Date.now() }];
    saveToStorage(next);
    set({ items: next });
  },
  remove: (symbol) => {
    const next = get().items.filter((i) => i.symbol !== symbol);
    saveToStorage(next);
    set({ items: next });
  },
  update: (symbol, patch) => {
    const next = get().items.map((i) => (i.symbol === symbol ? { ...i, ...patch } : i));
    saveToStorage(next);
    set({ items: next });
  },
  has: (symbol) => get().items.some((i) => i.symbol === symbol),
}));
