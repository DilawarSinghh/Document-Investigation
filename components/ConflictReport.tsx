"use client";
import { useState } from "react";
import { useStore } from "@/store/useStore";

export function ConflictReport({ docs }: { docs: { id: string; filename: string; status: string }[] }) {
  const { workspaceId } = useStore();
  const [conflicts, setConflicts] = useState<{ claimA: { doc: string; claim: string; page: number }; claimB: { doc: string; claim: string; page: number }; type: string; explanation: string; suggested_resolution: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const scan = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/conflict-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspace_id: workspaceId }) });
      setConflicts((await r.json()).conflicts ?? []);
    } finally { setLoading(false); }
  };
  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="text-lg font-bold">Conflict Report</h2>
      <p className="text-sm text-neutral-400">{docs.length} documents · scans numeric, date, and version drift across docs.</p>
      <button onClick={scan} disabled={loading || !workspaceId} className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50">
        {loading ? "Scanning…" : "Scan workspace"}
      </button>
      <div className="mt-4 space-y-3">
        {conflicts.map((c, i) => (
          <div key={i} className="rounded-xl border border-amber-700 bg-amber-950/20 p-4 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded bg-neutral-900 p-2"><b>{c.claimA.doc} (p.{c.claimA.page})</b><br />{c.claimA.claim}</div>
              <div className="rounded bg-neutral-900 p-2"><b>{c.claimB.doc} (p.{c.claimB.page})</b><br />{c.claimB.claim}</div>
            </div>
            <p className="mt-2 text-amber-300"><b>{c.type}:</b> {c.explanation}</p>
            <p className="text-neutral-400">Suggested: {c.suggested_resolution}</p>
          </div>
        ))}
        {!conflicts.length && !loading && <p className="text-sm text-neutral-500">No conflicts found yet — run a scan.</p>}
      </div>
    </div>
  );
}
