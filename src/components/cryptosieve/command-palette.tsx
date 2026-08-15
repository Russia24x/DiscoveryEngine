"use client";

import { useEffect, useState, useRef } from "react";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import { fmtUsd } from "@/lib/format";
import { Search, ArrowRight, X } from "lucide-react";

interface SearchResult {
  symbol: string;
  name: string;
  sector?: string;
  logoUrl?: string;
  priceUsd?: number;
  iaFinal?: number;
  decision?: string;
  marketRank?: number;
}

export function CommandPalette() {
  const { openProject } = useApp();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => {
          if (!prev) {
            // Reset state when opening.
            setQuery("");
            setSelectedIndex(0);
          }
          return !prev;
        });
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened. Reset state via key to force fresh mount.
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Fetch all projects once when opened.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/projects?showRejected=1")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setResults(j.projects ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Filter results.
  const filtered = query
    ? results.filter(
        (r) =>
          r.symbol.toLowerCase().includes(query.toLowerCase()) ||
          r.name?.toLowerCase().includes(query.toLowerCase()) ||
          r.sector?.toLowerCase().includes(query.toLowerCase())
      )
    : results.slice(0, 8);

  function selectResult(r: SearchResult) {
    openProject(r.symbol);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        selectResult(filtered[selectedIndex]);
      }
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-card text-xs text-muted-foreground hover:bg-muted transition-colors"
        title="Search (Cmd+K)"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search…</span>
        <kbd className="px-1.5 py-0.5 rounded bg-muted text-[9px] font-mono border border-border">⌘K</kbd>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-lg rounded-xl border border-border bg-popover shadow-2xl overflow-hidden animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search projects by symbol, name, or sector…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto scrollbar-thin p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No results for "{query}"
            </div>
          ) : (
            filtered.map((r, i) => (
              <button
                key={r.symbol}
                onClick={() => selectResult(r)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg p-2.5 text-start transition-colors",
                  i === selectedIndex ? "bg-primary/10" : "hover:bg-muted/50"
                )}
              >
                {r.logoUrl ? (
                  <img src={r.logoUrl} alt="" className="h-8 w-8 rounded-full shrink-0" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                    {r.symbol.slice(0, 2)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{r.symbol}</span>
                    <span className="text-xs text-muted-foreground truncate">{r.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {r.sector && <span>{r.sector}</span>}
                    {r.priceUsd && <span className="font-mono num">{fmtUsd(r.priceUsd)}</span>}
                    {r.marketRank && <span>· #{r.marketRank}</span>}
                  </div>
                </div>
                {r.iaFinal != null && (
                  <div className="text-end shrink-0">
                    <div className={cn(
                      "font-mono text-sm font-bold num",
                      r.iaFinal >= 18 ? "text-pass" : r.iaFinal >= 12 ? "text-investigate" : "text-reject"
                    )}>
                      {r.iaFinal.toFixed(1)}
                    </div>
                    <div className="text-[8px] text-muted-foreground uppercase">IA Final</div>
                  </div>
                )}
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 rtl:rotate-180" />
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-muted font-mono">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-muted font-mono">↵</kbd> select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-muted font-mono">esc</kbd> close
            </span>
          </div>
          <span className="font-mono num">{filtered.length} results</span>
        </div>
      </div>
    </div>
  );
}
