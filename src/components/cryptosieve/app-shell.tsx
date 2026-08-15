"use client";

import { useI18n } from "@/i18n/provider";
import { useApp, type View } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Radar,
  Coins,
  Newspaper,
  Database,
  Settings,
  BookOpen,
  Languages,
  Sun,
  Moon,
  Monitor,
  Github,
  GitCompareArrows,
  Grid3x3,
  Wallet,
  Bell,
  FlaskConical,
} from "lucide-react";
import { DashboardView } from "./views/dashboard";
import { ScannerView } from "./views/scanner";
import { ProjectDetailView } from "./views/project-detail";
import { CompareView } from "./views/compare";
import { HeatmapView } from "./views/heatmap";
import { PortfolioView } from "./views/portfolio";
import { CustomProjectView } from "./views/custom-project";
import { SourcesView } from "./views/sources";
import { NewsView } from "./views/news";
import { SettingsView } from "./views/settings";
import { FrameworkView } from "./views/framework";
import { CommandPalette } from "./command-palette";
import { AlertsBell, AlertsManager } from "./alerts";
import { useMonitoring } from "@/lib/use-monitoring";
import { KeyboardHelp } from "./keyboard-help";
import { useEffect } from "react";

const NAV: { key: View; icon: any; labelKey: string }[] = [
  { key: "dashboard", icon: LayoutDashboard, labelKey: "nav.dashboard" },
  { key: "scanner", icon: Radar, labelKey: "nav.scanner" },
  { key: "project", icon: Coins, labelKey: "nav.project" },
  { key: "compare", icon: GitCompareArrows, labelKey: "nav.compare" },
  { key: "heatmap", icon: Grid3x3, labelKey: "nav.heatmap" },
  { key: "portfolio", icon: Wallet, labelKey: "nav.portfolio" },
  { key: "alerts", icon: Bell, labelKey: "nav.alerts" },
  { key: "custom", icon: FlaskConical, labelKey: "nav.custom" },
  { key: "sources", icon: Database, labelKey: "nav.sources" },
  { key: "news", icon: Newspaper, labelKey: "nav.news" },
  { key: "settings", icon: Settings, labelKey: "nav.settings" },
  { key: "framework", icon: BookOpen, labelKey: "nav.framework" },
];

export function AppShell() {
  const { t, locale, setLocale, theme, setTheme } = useI18n();
  const { view, setView, scanning } = useApp();
  const { config: monitoringConfig } = useMonitoring();

  // Keyboard navigation: G+key to switch views, T for theme, L for language.
  useEffect(() => {
    let gPressed = false;
    let gTimer: ReturnType<typeof setTimeout> | null = null;

    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();

      if (key === "g") {
        gPressed = true;
        if (gTimer) clearTimeout(gTimer);
        gTimer = setTimeout(() => { gPressed = false; }, 800);
        return;
      }

      if (gPressed) {
        gPressed = false;
        if (gTimer) clearTimeout(gTimer);
        const viewMap: Record<string, View> = {
          d: "dashboard", s: "scanner", p: "portfolio", c: "compare",
          h: "heatmap", a: "alerts", f: "framework", n: "news",
        };
        if (viewMap[key]) {
          e.preventDefault();
          setView(viewMap[key]);
        }
        return;
      }

      if (key === "t") {
        e.preventDefault();
        setTheme(theme === "dark" ? "light" : "dark");
      }
      if (key === "l") {
        e.preventDefault();
        setLocale(locale === "fa" ? "en" : "fa");
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [theme, locale, setTheme, setLocale, setView]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <KeyboardHelp />
      {/* Top header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          {/* Logo + name */}
          <button
            onClick={() => setView("dashboard")}
            className="flex items-center gap-2.5 shrink-0"
          >
            <div className="relative h-8 w-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary" fill="none">
                <path
                  d="M3 5h18M6 12h12M9 19h6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
              </svg>
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="text-sm font-bold tracking-tight">{t.app.name}</span>
              <span className="text-[10px] text-muted-foreground">{t.app.tagline}</span>
            </div>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 mx-auto">
            {NAV.map((item) => (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5",
                  view === item.key
                    ? "bg-primary/12 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {(t.nav as any)[item.key.replace("framework", "framework")]}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 ms-auto md:ms-0">
            {/* Command palette trigger */}
            <CommandPalette />
            {/* Alerts bell */}
            <AlertsBell />
            {/* Locale toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setLocale(locale === "fa" ? "en" : "fa")}
              title={locale === "fa" ? "English" : "فارسی"}
            >
              <Languages className="h-4 w-4" />
              <span className="sr-only">toggle language</span>
            </Button>
            {/* Theme cycle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                setTheme(theme === "dark" ? "light" : theme === "light" ? "system" : "dark")
              }
              title={theme}
            >
              {theme === "dark" ? (
                <Moon className="h-4 w-4" />
              ) : theme === "light" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Monitor className="h-4 w-4" />
              )}
            </Button>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono hidden sm:inline">
              v1.0
            </span>
          </div>
        </div>
        {monitoringConfig.enabled && !scanning && (
          <div className="h-0.5 w-full bg-pass/20 overflow-hidden">
            <div className="h-full w-full bg-pass/60 animate-pulse-soft" />
          </div>
        )}
        {scanning && (
          <div className="h-0.5 w-full bg-muted overflow-hidden">
            <div className="h-full w-1/3 bg-primary shimmer" />
          </div>
        )}
      </header>

      {/* Mobile nav */}
      <nav className="md:hidden sticky top-14 z-30 glass border-b border-border overflow-x-auto scrollbar-thin">
        <div className="flex items-center gap-1 px-2 py-2 min-w-max">
          {NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap",
                view === item.key
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="h-3.5 w-3.5" />
              {(t.nav as any)[item.key]}
            </button>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {view === "dashboard" && <DashboardView />}
        {view === "scanner" && <ScannerView />}
        {view === "project" && <ProjectDetailView />}
        {view === "compare" && <CompareView />}
        {view === "heatmap" && <HeatmapView />}
        {view === "portfolio" && <PortfolioView />}
        {view === "alerts" && (
          <div className="p-4 md:p-6 max-w-4xl mx-auto">
            <AlertsManager />
          </div>
        )}
        {view === "custom" && <CustomProjectView />}
        {view === "sources" && <SourcesView />}
        {view === "news" && <NewsView />}
        {view === "settings" && <SettingsView />}
        {view === "framework" && <FrameworkView />}
      </main>

      {/* Footer (sticky to bottom) */}
      <footer className="mt-auto border-t border-border bg-card/40">
        <div className="px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground/80">{t.app.name}</span>
            <span>·</span>
            <span>{t.app.subtitle}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono num">Framework v1.0 · LOCKED</span>
            <Separator orientation="vertical" className="h-3" />
            <a
              href="https://github.com/Russia24x/DiscoveryEngine"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <Github className="h-3 w-3" />
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
