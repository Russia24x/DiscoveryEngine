"use client";

import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/i18n/provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Bot, Send, Sparkles, User, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

const SUGGESTED_QUESTIONS = [
  "Why is the decision INVESTIGATE and not PASS?",
  "What are the biggest risks for this project?",
  "What would break the investment thesis?",
  "How does the tokenomics affect the price?",
  "Is the capital flow bullish or bearish?",
  "What catalysts should I watch?",
];

export function CopilotChat({ symbol }: { symbol: string }) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function ask(question: string) {
    if (!question.trim() || loading) return;
    const userMsg: Message = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ symbol, question }),
      });
      const j = await res.json();
      if (j.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: j.answer }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: j.error ?? "AI request failed", error: true },
        ]);
        toast.error(j.error ?? "AI request failed");
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: e?.message ?? "Network error", error: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <div className="relative">
          <div className="absolute inset-0 grid-bg opacity-15 pointer-events-none" />
          <CardTitle className="relative text-sm flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            AI Research Copilot
            <span className="text-[10px] text-muted-foreground font-normal">v2.0</span>
            <span className="ms-auto text-[10px] text-muted-foreground font-mono">${symbol}</span>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Messages */}
        {messages.length > 0 ? (
          <div ref={scrollRef} className="space-y-2.5 max-h-72 overflow-y-auto scrollbar-thin pe-1">
            {messages.map((m, i) => (
              <MessageBubble key={i} message={m} />
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Bot className="h-4 w-4 text-primary animate-pulse" />
                <span className="animate-pulse-soft">AI is analyzing…</span>
              </div>
            )}
          </div>
        ) : (
          <div className="py-4">
            <p className="text-xs text-muted-foreground mb-3">
              Ask the AI about this project's scores, risks, thesis, or catalysts.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-card hover:bg-muted hover:border-primary/30 transition-colors text-muted-foreground hover:text-foreground"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this project…"
            disabled={loading}
            className="text-sm"
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()} className="shrink-0">
            <Send className="h-4 w-4 rtl:rotate-180" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-2", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "h-7 w-7 rounded-full flex items-center justify-center shrink-0",
          isUser ? "bg-muted" : "bg-primary/15 border border-primary/30"
        )}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5 text-muted-foreground" />
        ) : message.error ? (
          <AlertCircle className="h-3.5 w-3.5 text-reject" />
        ) : (
          <Bot className="h-3.5 w-3.5 text-primary" />
        )}
      </div>
      <div
        className={cn(
          "rounded-lg px-3 py-2 text-xs max-w-[85%]",
          isUser
            ? "bg-primary/10 text-foreground"
            : message.error
            ? "bg-reject/5 border border-reject/20 text-reject"
            : "bg-muted/50 text-foreground"
        )}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
      </div>
    </div>
  );
}
