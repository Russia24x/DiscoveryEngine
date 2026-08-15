"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useApp } from "@/lib/store";
import { useAlerts } from "@/lib/alerts-store";
import { toast } from "sonner";

const MONITORING_KEY = "cryptosieve.monitoring";
const MIN_INTERVAL = 60; // seconds (1 min minimum)

export interface MonitoringConfig {
  enabled: boolean;
  intervalSec: number;
}

function loadConfig(): MonitoringConfig {
  if (typeof window === "undefined") return { enabled: false, intervalSec: 300 };
  try {
    const raw = localStorage.getItem(MONITORING_KEY);
    return raw ? JSON.parse(raw) : { enabled: false, intervalSec: 300 };
  } catch {
    return { enabled: false, intervalSec: 300 };
  }
}

function saveConfig(cfg: MonitoringConfig) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MONITORING_KEY, JSON.stringify(cfg));
  } catch {}
}

export function useMonitoring() {
  const { scanResults, setScanResults, setScanMeta, setScanning } = useApp();
  const { rules, triggerAlert } = useAlerts();
  const prevResultsRef = useRef<Map<string, any>>(new Map());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [config, setConfigState] = useState<MonitoringConfig>(loadConfig);

  const runScan = useCallback(async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ useLive: true }),
      });
      const j = await res.json();
      const results = j.results ?? [];
      setScanResults(results);
      setScanMeta({
        live: j.live,
        sourcesUsed: j.sourcesUsed,
        marketRegime: j.marketRegime,
        universeSize: j.universeSize,
        passed: j.passed,
        rejected: j.rejected,
        investigate: j.investigate,
      });

      // Check for alert triggers by comparing with previous results.
      const prevMap = prevResultsRef.current;
      const newMap = new Map(results.map((r: any) => [r.symbol, r]));

      for (const rule of rules) {
        if (!rule.enabled) continue;
        const prev = prevMap.get(rule.symbol);
        const curr = newMap.get(rule.symbol);
        if (!curr) continue;

        if (rule.type === "score_threshold" && rule.threshold != null) {
          const prevIa = prev?.iaFinal;
          const currIa = curr.iaFinal;
          if (prevIa != null && currIa != null && prevIa >= rule.threshold && currIa < rule.threshold) {
            triggerAlert({
              ruleId: rule.id,
              symbol: rule.symbol,
              type: "score_threshold",
              severity: rule.severity,
              title: `${rule.symbol} IA dropped below ${rule.threshold}`,
              message: `IA Final went from ${prevIa.toFixed(1)} to ${currIa.toFixed(1)} — below your threshold.`,
            });
          }
        }

        if (rule.type === "decision_change") {
          const prevDec = prev?.decision;
          const currDec = curr.decision;
          if (prevDec && currDec && prevDec !== currDec) {
            triggerAlert({
              ruleId: rule.id,
              symbol: rule.symbol,
              type: "decision_change",
              severity: rule.severity,
              title: `${rule.symbol} decision changed: ${prevDec} → ${currDec}`,
              message: `The investment decision for ${rule.symbol} has changed from ${prevDec} to ${currDec}.`,
            });
          }
        }

        if (rule.type === "gate_breach") {
          const prevGate = prev?.gatePassed;
          const currGate = curr.gatePassed;
          if (prevGate === true && currGate === false) {
            triggerAlert({
              ruleId: rule.id,
              symbol: rule.symbol,
              type: "gate_breach",
              severity: "critical",
              title: `${rule.symbol} gate breached`,
              message: `${rule.symbol} has failed a gate check. Previous: PASS, now: FAIL.`,
            });
          }
        }

        if (rule.type === "thesis_change") {
          const prevThesis = prev?.thesis?.status;
          const currThesis = curr.thesis?.status;
          if (prevThesis && currThesis && prevThesis !== currThesis) {
            triggerAlert({
              ruleId: rule.id,
              symbol: rule.symbol,
              type: "thesis_change",
              severity: rule.severity,
              title: `${rule.symbol} thesis: ${prevThesis} → ${currThesis}`,
              message: `Thesis status for ${rule.symbol} changed from ${prevThesis} to ${currThesis}.`,
            });
          }
        }
      }

      prevResultsRef.current = newMap;
    } catch (e) {
      console.error("[monitoring] scan failed:", e);
    } finally {
      setScanning(false);
    }
  }, [setScanning, setScanResults, setScanMeta, rules, triggerAlert]);

  const start = useCallback((intervalSec: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const safeInterval = Math.max(MIN_INTERVAL, intervalSec);
    timerRef.current = setInterval(() => {
      runScan();
    }, safeInterval * 1000);
    const newConfig = { enabled: true, intervalSec: safeInterval };
    setConfigState(newConfig);
    saveConfig(newConfig);
  }, [runScan]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setConfigState((prev) => {
      const newConfig = { ...prev, enabled: false };
      saveConfig(newConfig);
      return newConfig;
    });
  }, []);

  const setConfig = useCallback((enabled: boolean, intervalSec: number) => {
    if (enabled) {
      start(intervalSec);
      toast.success(`Monitoring started — auto-scan every ${intervalSec}s`);
    } else {
      stop();
      toast.info("Monitoring stopped");
    }
  }, [start, stop]);

  // Restore monitoring on mount if it was enabled.
  useEffect(() => {
    const cfg = loadConfig();
    if (cfg.enabled) {
      start(cfg.intervalSec);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [start]);

  return { config, setConfig, runScan };
}
