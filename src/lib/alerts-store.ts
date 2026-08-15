"use client";

import { create } from "zustand";

export type AlertType =
  | "thesis_change"
  | "gate_breach"
  | "price_target"
  | "score_threshold"
  | "decision_change";

export type AlertSeverity = "info" | "warn" | "critical";

export interface AlertRule {
  id: string;
  type: AlertType;
  symbol: string;
  label: string;
  condition: string; // human-readable
  threshold?: number;
  severity: AlertSeverity;
  enabled: boolean;
  createdAt: number;
  lastTriggered?: number;
}

export interface TriggeredAlert {
  id: string;
  ruleId: string;
  symbol: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

interface AlertsState {
  rules: AlertRule[];
  triggered: TriggeredAlert[];
  loaded: boolean;
  load: () => void;
  addRule: (rule: Omit<AlertRule, "id" | "createdAt">) => void;
  removeRule: (id: string) => void;
  toggleRule: (id: string) => void;
  triggerAlert: (alert: Omit<TriggeredAlert, "id" | "timestamp" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearTriggered: () => void;
}

const RULES_KEY = "cryptosieve.alertRules";
const TRIGGERED_KEY = "cryptosieve.triggeredAlerts";

function loadRules(): AlertRule[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RULES_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function loadTriggered(): TriggeredAlert[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(TRIGGERED_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveRules(rules: AlertRule[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RULES_KEY, JSON.stringify(rules));
  } catch {}
}

function saveTriggered(triggered: TriggeredAlert[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TRIGGERED_KEY, JSON.stringify(triggered));
  } catch {}
}

function genId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useAlerts = create<AlertsState>((set, get) => ({
  rules: [],
  triggered: [],
  loaded: false,
  load: () => {
    if (get().loaded) return;
    set({ rules: loadRules(), triggered: loadTriggered(), loaded: true });
  },
  addRule: (rule) => {
    const next = [...get().rules, { ...rule, id: genId(), createdAt: Date.now() }];
    saveRules(next);
    set({ rules: next });
  },
  removeRule: (id) => {
    const next = get().rules.filter((r) => r.id !== id);
    saveRules(next);
    set({ rules: next });
  },
  toggleRule: (id) => {
    const next = get().rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    saveRules(next);
    set({ rules: next });
  },
  triggerAlert: (alert) => {
    const next = [
      { ...alert, id: genId(), timestamp: Date.now(), read: false },
      ...get().triggered,
    ].slice(0, 100); // keep last 100
    saveTriggered(next);
    set({ triggered: next });
  },
  markRead: (id) => {
    const next = get().triggered.map((a) => (a.id === id ? { ...a, read: true } : a));
    saveTriggered(next);
    set({ triggered: next });
  },
  markAllRead: () => {
    const next = get().triggered.map((a) => ({ ...a, read: true }));
    saveTriggered(next);
    set({ triggered: next });
  },
  clearTriggered: () => {
    saveTriggered([]);
    set({ triggered: [] });
  },
}));
