"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Database, KeyRound, CheckCircle2, Zap, Plus, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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

      {/* Add custom RSS source */}
      <AddCustomSourceCard onAdded={load} />
    </div>
  );
}

function AddCustomSourceCard({ onAdded }: { onAdded: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  async function addSource() {
    if (!url.trim()) {
      toast.error("URL is required");
      return;
    }
    // Validate URL
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        toast.error("Only http/https URLs allowed");
        return;
      }
    } catch {
      toast.error("Invalid URL");
      return;
    }
    setSaving(true);
    try {
      // Add as an RSS news feed source (the most common custom source type).
      const res = await fetch("/api/news", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "rss", url: url.trim(), label: label.trim() || undefined }),
      });
      const j = await res.json();
      if (j.error) {
        toast.error(j.error);
      } else {
        toast.success(`Source "${label || url}" added`);
        setUrl("");
        setLabel("");
        setOpen(false);
        onAdded();
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to add source");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="border-dashed cursor-pointer hover:border-primary/30 transition-colors">
          <CardContent className="p-4 flex items-center gap-3 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Plus className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="font-medium text-foreground">{t.sources.addSource}</div>
              <div>Add an RSS feed as a custom data source</div>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            Add Custom Source
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Feed URL</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/feed.xml"
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Label (optional)</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="My Crypto Feed"
              className="text-sm"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            The feed will be added as an RSS source. Use the News &amp; Social view to sync and view items.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={addSource} disabled={saving}>
              {saving ? "Adding…" : "Add Source"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
