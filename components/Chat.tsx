"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, FileText, HelpCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { useStore, type Conflict, type Verdict } from "@/store/useStore";
import { cn } from "@/lib/utils";

const SUGGESTED = [
  "What is the refund window?",
  "How long is data retained after closure?",
  "Which policy version is newest?",
];

function VerdictBadge({ verdict }: { verdict?: Verdict }) {
  if (!verdict) return null;
  const map = {
    confident: {
      label: "Confident",
      icon: null,
      className: "border-success/30 bg-success/10 text-success",
    },
    conflicting: {
      label: "Conflict detected",
      icon: AlertTriangle,
      className: "border-warning/30 bg-warning/10 text-warning",
    },
    insufficient_evidence: {
      label: "Insufficient evidence",
      icon: HelpCircle,
      className: "border-border bg-muted text-muted-foreground",
    },
  } as const;
  const v = map[verdict];
  const Icon = v.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        v.className
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {v.label}
    </span>
  );
}

function ConflictCard({ conflict }: { conflict: Conflict }) {
  return (
    <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {([conflict.claimA, conflict.claimB] as const).map((c, i) => (
          <div key={i} className="rounded-md border border-border bg-card p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span className="font-mono">{c.doc}</span>
              <span>· p.{c.page}</span>
            </div>
            <p className="mt-1.5 text-sm leading-5">{c.claim}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs leading-5 text-warning">
        <span className="font-medium">{conflict.type.replace(/_/g, " ")}</span>
        {" — "}
        {conflict.explanation}
      </p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4" aria-label="Loading answer">
      <div className="h-4 w-28 animate-pulse rounded bg-muted" />
      <div className="h-3 w-full animate-pulse rounded bg-muted" />
      <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
    </div>
  );
}

export function Chat() {
  const { workspaceId, messages, push, set } = useStore();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // "/" focuses the composer from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  const ask = async (question: string) => {
    if (!question.trim() || !workspaceId || loading) return;
    push({ id: crypto.randomUUID(), role: "user", content: question });
    setQ("");
    setLoading(true);
    try {
      const r = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId, question }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Request failed");
      push({
        id: crypto.randomUUID(),
        role: "assistant",
        content: j.answer,
        verdict: j.verdict,
        citations: j.citations,
        conflicts: j.conflicts,
        uncertainty_note: j.uncertainty_note,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Request failed. Please retry.";
      console.error("[ask]", msg);
      toast.error("Could not get an answer", { description: msg });
      push({ id: crypto.randomUUID(), role: "assistant", content: msg, verdict: "insufficient_evidence" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[720px] px-4 pb-6 pt-8">
          {!messages.length && !loading && (
            <div className="flex flex-col items-center py-16 text-center">
              <h2 className="text-lg font-medium">Ask across your documents</h2>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Answers come with citations. Conflicts are flagged, and gaps are stated honestly.
              </p>
              <div className="mt-5 flex max-w-md flex-wrap items-center justify-center gap-2">
                {SUGGESTED.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => ask(s)}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((m) => (
              <div key={m.id} className={cn(m.role === "user" && "flex justify-end")}>
                {m.role === "user" ? (
                  <div className="max-w-[85%] rounded-lg bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                    {m.content}
                  </div>
                ) : (
                  <div className="space-y-2 rounded-lg border border-border bg-card p-4 animate-slide-up">
                    <VerdictBadge verdict={m.verdict} />
                    <p className="whitespace-pre-wrap text-sm leading-6">{m.content}</p>
                    {!!m.citations?.length && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {m.citations.map((c, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => set({ source: { docId: c.doc_id, page: c.page, quote: c.quote } })}
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-0.5 font-mono text-xs text-foreground transition-colors duration-150 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <FileText className="h-3 w-3 text-muted-foreground" />
                            {c.filename} · p.{c.page}
                          </button>
                        ))}
                      </div>
                    )}
                    {!!m.conflicts?.length &&
                      m.conflicts.map((cf, i) => <ConflictCard key={i} conflict={cf} />)}
                    {m.uncertainty_note && (
                      <p className="border-t border-border pt-2 text-xs italic text-muted-foreground">
                        {m.uncertainty_note}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
            {loading && <Skeleton />}
          </div>
        </div>
      </div>

      <div className="border-t border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[720px] items-center gap-2 px-4 py-3">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask(q)}
            placeholder="Ask a question…  ( / to focus )"
            aria-label="Ask a question"
            className="h-10 flex-1 rounded-lg border border-input bg-background px-3.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="button"
            onClick={() => ask(q)}
            disabled={loading || !q.trim()}
            aria-label="Send question"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors duration-150 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
