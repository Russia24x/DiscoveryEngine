"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Keyboard, X } from "lucide-react";

const SHORTCUTS = [
  { keys: ["⌘", "K"], label: "Open command palette / search" },
  { keys: ["?"], label: "Toggle this help overlay" },
  { keys: ["Esc"], label: "Close dialogs / overlays" },
  { keys: ["G", "D"], label: "Go to Dashboard" },
  { keys: ["G", "S"], label: "Go to Scanner" },
  { keys: ["G", "P"], label: "Go to Portfolio" },
  { keys: ["G", "C"], label: "Go to Compare" },
  { keys: ["G", "H"], label: "Go to Heatmap" },
  { keys: ["G", "A"], label: "Go to Alerts" },
  { keys: ["G", "F"], label: "Go to Framework" },
  { keys: ["T"], label: "Toggle theme (dark/light)" },
  { keys: ["L"], label: "Toggle language (fa/en)" },
];

export function KeyboardHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Don't trigger if user is typing in an input.
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;

      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-xl border border-border bg-popover shadow-2xl overflow-hidden animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-primary" />
            Keyboard Shortcuts
          </span>
          <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-4 space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, j) => (
                  <kbd
                    key={j}
                    className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono font-semibold min-w-[20px] text-center"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border text-[10px] text-muted-foreground">
          Press <kbd className="px-1 py-0.5 rounded bg-muted font-mono">?</kbd> anytime to toggle this overlay
        </div>
      </div>
    </div>
  );
}
