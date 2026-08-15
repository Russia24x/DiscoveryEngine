"use client";

import { useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Languages, Palette, Info, FileText, Shield, Download, Upload, Database, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { handleExport, handleImport } from "@/lib/data-io";
import { useMonitoring } from "@/lib/use-monitoring";

export function SettingsView() {
  const { t, locale, setLocale, theme, setTheme } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const { config, setConfig } = useMonitoring();
  const [intervalSec, setIntervalSec] = useState(config.intervalSec || 300);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">{t.settings.title}</h1>
      </div>

      {/* Language */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Languages className="h-4 w-4 text-primary" />
            {t.settings.language}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={locale === "fa" ? "default" : "outline"}
              onClick={() => setLocale("fa")}
              className="gap-2"
            >
              {t.settings.persian}
              <Badge variant="outline" className="text-[9px] bg-background/50">RTL</Badge>
            </Button>
            <Button
              variant={locale === "en" ? "default" : "outline"}
              onClick={() => setLocale("en")}
              className="gap-2"
            >
              {t.settings.english}
              <Badge variant="outline" className="text-[9px] bg-background/50">LTR</Badge>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            {t.settings.theme}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {(["light", "dark", "system"] as const).map((th) => (
              <Button
                key={th}
                variant={theme === th ? "default" : "outline"}
                onClick={() => setTheme(th)}
                className="text-xs"
              >
                {(t.settings as any)[th]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            {t.settings.about}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">{t.settings.aboutText}</p>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">{t.settings.frameworkVersion}:</span>
            <Badge variant="outline" className="font-mono gap-1">
              <Shield className="h-3 w-3 text-pass" /> v1.0 LOCKED
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="outline" size="sm" asChild className="gap-1.5">
              <a href="/FRAMEWORK.md" target="_blank" rel="noreferrer">
                <FileText className="h-3.5 w-3.5" /> {t.settings.viewFramework}
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild className="gap-1.5">
              <a href="/RULES.md" target="_blank" rel="noreferrer">
                <Shield className="h-3.5 w-3.5" /> {t.settings.viewRules}
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Continuous Monitoring */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Radio className={cn("h-4 w-4 text-primary", config.enabled && "animate-pulse")} />
            Continuous Monitoring
            {config.enabled && (
              <Badge className="text-[9px] gap-1 bg-pass/15 text-pass border-pass/30">
                <span className="h-1.5 w-1.5 rounded-full bg-pass animate-pulse" />
                ACTIVE
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Auto-scan the market on an interval and trigger alerts when scores, decisions, gates, or thesis status change.
          </p>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={config.enabled}
                onCheckedChange={(v) => setConfig(v, intervalSec)}
              />
              <span className="text-xs">{config.enabled ? "Monitoring" : "Stopped"}</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Interval:</span>
              <select
                value={intervalSec}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  setIntervalSec(v);
                  if (config.enabled) setConfig(true, v);
                }}
                className="h-8 rounded-md border border-border bg-background px-2 text-xs"
              >
                <option value={60}>1 min</option>
                <option value={300}>5 min</option>
                <option value={600}>10 min</option>
                <option value={1800}>30 min</option>
                <option value={3600}>1 hour</option>
              </select>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/70">
            Min interval is 60s to avoid rate-limiting free APIs. Alerts trigger automatically when monitored values change.
          </p>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Data Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Export your watchlist, portfolio, and alert rules to a JSON backup file. Import to restore on another device.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export Backup
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5">
              <Upload className="h-3.5 w-3.5" /> Import Backup
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImport(file);
                e.target.value = "";
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tech */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              ["Framework", "Next.js 16"],
              ["Engine", "TypeScript pure"],
              ["Data", "Prisma + SQLite"],
              ["Sources", "CoinGecko · DeFiLlama · Binance"],
              ["I18N", "fa (RTL) + en (LTR)"],
              ["Deploy", "Web · Mobile · Desktop"],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
