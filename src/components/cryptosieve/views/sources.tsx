"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Database, KeyRound, CheckCircle2, Zap, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SourceRow {
  key: string;
  name: string;
  type: "free" | "apikey";
  requiresKey: boolean;
  endpoint: string;
  coverage: string;
  enabled: boolean;
  apiKeySet: boolean;
  apiKeyMasked: string | null;
  lastSync: string | null;
}

export function SourcesView() {
  const { t } = useI18n();
  const [sources, setSources] = useState<SourceRow[] | null>(null);
  const [keyInput, setKeyInput] = useState<Record<string, string>>({});

  async function load() {
    const r = await fetch("/api/datasources");
    const j = await r.json();
    setSources(j.sources);
  }
  useEffect(() => {
    let cancelled = false;
    fetch("/api/datasources")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setSources(j.sources);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle(key: string, enabled: boolean) {
    await fetch("/api/datasources", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key, enabled }),
    });
    load();
  }
  async function saveKey(key: string) {
    const v = keyInput[key];
    if (!v) return;
    await fetch("/api/datasources", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key, apiKey: v }),
    });
    setKeyInput({ ...keyInput, [key]: "" });
    toast.success(`${key} API key saved`);
    load();
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          {t.sources.title}
        </h1>
        <p className="text-xs text-muted-foreground">{t.sources.subtitle}</p>
      </div>

      {!sources ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {sources.map((s) => (
            <Card key={s.key} className={cn(!s.enabled && "opacity-60")}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                      s.type === "free" ? "bg-pass/12 text-pass" : "bg-investigate/12 text-investigate"
                    )}
                  >
                    {s.type === "free" ? <Zap className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{s.name}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">{s.key}</Badge>
                      {s.type === "free" ? (
                        <Badge className="text-[10px] bg-pass/15 text-pass border-pass/25">{t.sources.free}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] border-investigate/30 text-investigate">
                          {t.sources.requiresKey}
                        </Badge>
                      )}
                      {s.apiKeySet && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <CheckCircle2 className="h-3 w-3 text-pass" /> {t.sources.apiKey}: {s.apiKeyMasked}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{s.coverage}</p>
                    <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5 truncate">{s.endpoint}</p>

                    {s.requiresKey && (
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          type="password"
                          placeholder={s.apiKeySet ? "••••  (enter new to replace)" : t.sources.apiKey}
                          value={keyInput[s.key] ?? ""}
                          onChange={(e) => setKeyInput({ ...keyInput, [s.key]: e.target.value })}
                          className="h-8 text-xs max-w-xs"
                        />
                        <Button size="sm" variant="outline" className="h-8" onClick={() => saveKey(s.key)} disabled={!keyInput[s.key]}>
                          {t.common.save}
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Switch checked={s.enabled} onCheckedChange={(v) => toggle(s.key, v)} />
                      <span className="text-[10px] text-muted-foreground">
                        {s.enabled ? t.sources.active : t.sources.inactive}
                      </span>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-dashed">
        <CardContent className="p-4 flex items-center gap-3 text-xs text-muted-foreground">
          <Plus className="h-4 w-4" />
          <span>{t.sources.subtitle} — {t.sources.addSource}</span>
        </CardContent>
      </Card>
    </div>
  );
}
