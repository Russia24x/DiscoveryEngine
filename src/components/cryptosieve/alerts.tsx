"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { useAlerts, type TriggeredAlert, type AlertRule } from "@/lib/alerts-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";
import { Bell, BellRing, Trash2, Check, X, Plus, AlertTriangle, ShieldAlert, Info } from "lucide-react";
import { toast } from "sonner";

export function AlertsBell() {
  const { load, triggered, markAllRead, clearTriggered } = useAlerts();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  const unread = triggered.filter((a) => !a.read).length;
  const hasUnread = unread > 0;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 relative"
        onClick={() => setOpen(!open)}
        title="Alerts"
      >
        {hasUnread ? (
          <BellRing className="h-4 w-4 text-primary" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        {hasUnread && (
          <span className="absolute -top-0.5 -end-0.5 h-4 w-4 rounded-full bg-reject text-reject-foreground text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute end-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-popover shadow-xl z-40 overflow-hidden animate-fade-up">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5 text-primary" />
                Alerts
                {hasUnread && <Badge variant="outline" className="text-[9px] h-4">{unread} new</Badge>}
              </span>
              <div className="flex items-center gap-1">
                {hasUnread && (
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={markAllRead}>
                    <Check className="h-3 w-3" /> Mark all read
                  </Button>
                )}
                {triggered.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={clearTriggered}>
                    <Trash2 className="h-3 w-3" /> Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Alerts list */}
            <div className="max-h-80 overflow-y-auto scrollbar-thin">
              {triggered.length === 0 ? (
                <div className="py-8 flex flex-col items-center text-center gap-2">
                  <Bell className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">No alerts yet</p>
                  <p className="text-[10px] text-muted-foreground/70">Create alert rules to get notified</p>
                </div>
              ) : (
                triggered.slice(0, 20).map((a) => (
                  <AlertItem key={a.id} alert={a} onClick={() => {
                    useApp.getState().openProject(a.symbol);
                    setOpen(false);
                  }} />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AlertItem({ alert, onClick }: { alert: TriggeredAlert; onClick: () => void }) {
  const { markRead } = useAlerts();
  const Icon = alert.severity === "critical" ? ShieldAlert : alert.severity === "warn" ? AlertTriangle : Info;
  const color =
    alert.severity === "critical" ? "text-reject" : alert.severity === "warn" ? "text-investigate" : "text-primary";
  return (
    <button
      onClick={() => {
        markRead(alert.id);
        onClick();
      }}
      className={cn(
        "w-full flex items-start gap-2 px-3 py-2.5 border-b border-border text-start transition-colors hover:bg-muted/40",
        !alert.read && "bg-primary/5"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", color)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold truncate">{alert.title}</span>
          {!alert.read && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
        </div>
        <p className="text-[10px] text-muted-foreground line-clamp-2">{alert.message}</p>
        <span className="text-[9px] text-muted-foreground/70">{timeAgo(new Date(alert.timestamp))} ago</span>
      </div>
    </button>
  );
}

// Alert rule management component (used in a dedicated view or settings).
export function AlertsManager() {
  const { rules, load, addRule, removeRule, toggleRule, triggerAlert } = useAlerts();
  const { openProject } = useApp();
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  function createSampleAlerts() {
    // Create sample triggered alerts for demo purposes.
    triggerAlert({
      ruleId: "demo",
      symbol: "HYPE",
      type: "thesis_change",
      severity: "warn",
      title: "HYPE thesis weakened",
      message: "Thesis intact % dropped from 82% to 68% after revenue growth slowed.",
    });
    triggerAlert({
      ruleId: "demo",
      symbol: "AAVE",
      type: "gate_breach",
      severity: "critical",
      title: "AAVE VAE gate breached",
      message: "Value Accrual Efficiency dropped below 10% — universal gate triggered.",
    });
    toast.success("Sample alerts created");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" />
            Alerts & Notifications
          </h2>
          <p className="text-xs text-muted-foreground">Get notified when thesis changes, gates breach, or price targets hit.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={createSampleAlerts} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> Demo alerts
          </Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> New rule
          </Button>
        </div>
      </div>

      {showForm && <CreateRuleForm onClose={() => setShowForm(false)} />}

      {/* Active rules */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Alert Rules</h3>
        {rules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No alert rules yet</p>
            <p className="text-[10px] text-muted-foreground/70 mt-1">Click "New rule" to create your first alert.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map((r) => (
              <RuleRow key={r.id} rule={r} onToggle={() => toggleRule(r.id)} onRemove={() => removeRule(r.id)} onClick={() => openProject(r.symbol)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RuleRow({ rule, onToggle, onRemove, onClick }: { rule: AlertRule; onToggle: () => void; onRemove: () => void; onClick: () => void }) {
  const sevColor =
    rule.severity === "critical" ? "text-reject" : rule.severity === "warn" ? "text-investigate" : "text-primary";
  return (
    <div className={cn("flex items-center gap-3 rounded-lg border p-3", rule.enabled ? "border-border bg-card" : "border-border bg-muted/30 opacity-60")}>
      <button onClick={onClick} className="flex items-center gap-2.5 flex-1 min-w-0 text-start">
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", sevColor, "bg-muted/40")}>
          {rule.severity === "critical" ? <ShieldAlert className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{rule.label}</div>
          <div className="text-[10px] text-muted-foreground">{rule.condition}</div>
        </div>
      </button>
      <Badge variant="outline" className="text-[9px] shrink-0">{rule.type.replace("_", " ")}</Badge>
      <button onClick={onToggle} className={cn("h-5 w-9 rounded-full transition-colors shrink-0", rule.enabled ? "bg-primary" : "bg-muted")}>
        <div className={cn("h-3.5 w-3.5 rounded-full bg-background transition-transform mt-0.5", rule.enabled ? "translate-x-4" : "translate-x-1")} />
      </button>
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onRemove}>
        <X className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    </div>
  );
}

function CreateRuleForm({ onClose }: { onClose: () => void }) {
  const { addRule } = useAlerts();
  const [type, setType] = useState<AlertType>("score_threshold");
  const [symbol, setSymbol] = useState("");
  const [threshold, setThreshold] = useState("");
  const [severity, setSeverity] = useState<AlertSeverity>("warn");

  function create() {
    if (!symbol) {
      toast.error("Symbol required");
      return;
    }
    const labels: Record<AlertType, string> = {
      thesis_change: `${symbol} thesis status change`,
      gate_breach: `${symbol} gate breach`,
      price_target: `${symbol} price target`,
      score_threshold: `${symbol} IA below ${threshold || "X"}`,
      decision_change: `${symbol} decision change`,
    };
    const conditions: Record<AlertType, string> = {
      thesis_change: "Alert when thesis status changes (intact → weakened → broken)",
      gate_breach: "Alert when any gate fails (VAE, δ, R, SAR)",
      price_target: `Alert when price hits $${threshold || "target"}`,
      score_threshold: `Alert when IA Final drops below ${threshold || "threshold"}`,
      decision_change: "Alert when decision changes (PASS ↔ INVESTIGATE ↔ REJECT)",
    };
    addRule({
      type,
      symbol: symbol.toUpperCase(),
      label: labels[type],
      condition: conditions[type],
      threshold: threshold ? parseFloat(threshold) : undefined,
      severity,
      enabled: true,
    });
    toast.success("Alert rule created");
    onClose();
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Create Alert Rule</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AlertType)}
            className="w-full h-9 rounded-md border border-border bg-background px-2 text-xs"
          >
            <option value="score_threshold">IA Score Threshold</option>
            <option value="thesis_change">Thesis Change</option>
            <option value="gate_breach">Gate Breach</option>
            <option value="price_target">Price Target</option>
            <option value="decision_change">Decision Change</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Symbol</label>
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="e.g. HYPE"
            className="w-full h-9 rounded-md border border-border bg-background px-2 text-xs"
          />
        </div>
        {(type === "score_threshold" || type === "price_target") && (
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {type === "price_target" ? "Target Price ($)" : "Threshold"}
            </label>
            <input
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder={type === "price_target" ? "25.00" : "15"}
              type="number"
              step="any"
              className="w-full h-9 rounded-md border border-border bg-background px-2 text-xs"
            />
          </div>
        )}
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Severity</label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as AlertSeverity)}
            className="w-full h-9 rounded-md border border-border bg-background px-2 text-xs"
          >
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={create}>Create Rule</Button>
      </div>
    </div>
  );
}
