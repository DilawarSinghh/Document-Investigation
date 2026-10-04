"use client";
import { useState } from "react";
import { useStore } from "@/store/useStore";

const badge = (v?: string) =>
  v === "confident" ? "bg-emerald-600" : v === "conflicting" ? "bg-amber-600" : "bg-neutral-600";
const label = (v?: string) =>
  v === "confident" ? "Confident" : v === "conflicting" ? "Conflict detected" : "Insufficient evidence";

const SUGGESTED = ["What is the refund window?", "What is the data retention period?", "Which policy version is newest?"];

export function Chat() {
  const { workspaceId, messages, push, set } = useStore();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const ask = async (question: string) => {
    if (!question.trim() || !workspaceId) return;
    push({ id: crypto.randomUUID(), role: "user", content: question });
    setQ(""); setLoading(true);
    try {
      const r = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspace_id: workspaceId, question }) });
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      push({ id: crypto.randomUUID(), role: "assistant", content: j.answer, verdict: j.verdict, citations: j.citations, conflicts: j.conflicts, uncertainty_note: j.uncertainty_note });
    } catch (e: unknown) {
      push({ id: crypto.randomUUID(), role: "assistant", content: e instanceof Error ? e.message : "Request failed. Retry.", verdict: "insufficient_evidence" });
    } finally { setLoading(false); }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="space-y-4">
        {!messages.length && (
          <div className="rounded-xl border border-neutral-800 p-6 text-sm text-neutral-400">
            Upload documents, then try a suggested question:
            <div className="mt-2 flex flex-wrap gap-2">
              {SUGGESTED.map((s) => <button key={s} onClick={() => ask(s)} className="rounded-full border border-neutral-700 px-3 py-1 hover:bg-neutral-800">{s}</button>)}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`rounded-xl p-4 ${m.role === "user" ? "bg-neutral-800" : "border border-neutral-800 bg-neutral-900"}`}>
            {m.role === "assistant" && m.verdict && (
              <span className={`mb-2 inline-block rounded-full px-2 py-0.5 text-xs text-white ${badge(m.verdict)}`}>{label(m.verdict)}</span>
            )}
            <p className="whitespace-pre-wrap text-sm">{m.content}</p>
            {!!m.citations?.length && (
              <div className="mt-2 flex flex-wrap gap-1">
                {m.citations.map((c, i) => (
                  <button key={i} onClick={() => set({ source: { docId: c.doc_id, page: c.page, quote: c.quote } })}
                    className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-emerald-300 hover:bg-neutral-700">
                    {c.filename} p.{c.page}
                  </button>
                ))}
              </div>
            )}
            {!!m.conflicts?.length && m.conflicts.map((cf, i) => (
              <div key={i} className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-amber-700 bg-amber-950/30 p-2 text-xs">
                <div><b>A: {cf.claimA.doc}</b><br />{cf.claimA.claim}</div>
                <div><b>B: {cf.claimB.doc}</b><br />{cf.claimB.claim}</div>
                <p className="col-span-2 text-amber-300">{cf.type}: {cf.explanation}</p>
              </div>
            ))}
            {m.uncertainty_note && <p className="mt-2 text-xs italic text-neutral-500">{m.uncertainty_note}</p>}
          </div>
        ))}
        {loading && <div className="animate-pulse rounded-xl border border-neutral-800 p-4 text-sm text-neutral-500">Searching evidence… extracting claims… checking conflicts…</div>}
      </div>
      <div className="sticky bottom-0 mt-4 flex gap-2 bg-neutral-950 py-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask(q)}
          placeholder="Ask across your documents…" className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" />
        <button onClick={() => ask(q)} disabled={loading} className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50">Ask</button>
      </div>
    </div>
  );
}
