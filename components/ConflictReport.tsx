"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useStore, type Conflict } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TYPES = ["numeric", "date", "version_drift", "direct_contradiction"] as const;

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-warning/30 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
      <AlertTriangle className="h-3 w-3" />
      {type.replace(/_/g, " ")}
    </span>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2" aria-label="Scanning workspace">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-lg border border-border bg-card" />
      ))}
    </div>
  );
}

export function ConflictReport({ docs }: { docs: { id: string; filename: string; status: string }[] }) {
  const { workspaceId } = useStore();
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [docFilter, setDocFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const scan = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const r = await fetch("/api/conflict-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Scan failed");
      setConflicts(j.conflicts ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Scan failed";
      console.error("[conflict-report]", msg);
      toast.error("Could not scan workspace", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!conflicts) return [];
    return conflicts.filter(
      (c) =>
        (docFilter === "all" || c.claimA.doc === docFilter || c.claimB.doc === docFilter) &&
        (typeFilter === "all" || c.type === typeFilter)
    );
  }, [conflicts, docFilter, typeFilter]);

  const selectCls =
    "h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Conflict Report</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {docs.length} document{docs.length === 1 ? "" : "s"} · scans for numeric, date, and
            version drift across documents.
          </p>
        </div>
        <Button onClick={scan} disabled={loading || !workspaceId}>
          <RefreshCw className={cn(loading && "animate-spin")} />
          {loading ? "Scanning…" : "Scan workspace"}
        </Button>
      </div>

      {conflicts && (
        <div className="mt-4 flex flex-wrap gap-2">
          <select
            value={docFilter}
            onChange={(e) => setDocFilter(e.target.value)}
            className={selectCls}
            aria-label="Filter by document"
          >
            <option value="all">All documents</option>
            {docs.map((d) => (
              <option key={d.id} value={d.filename}>
                {d.filename}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={selectCls}
            aria-label="Filter by conflict type"
          >
            <option value="all">All types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <SkeletonRows />
        ) : !conflicts ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No scan yet. Run a scan to detect conflicts across your documents.
            </p>
            <Button onClick={scan} disabled={!workspaceId} variant="outline" size="sm" className="mt-3">
              Scan now
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {conflicts.length === 0
                ? "No conflicts detected. Your documents agree with each other."
                : "No conflicts match the current filters."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="hidden grid-cols-[130px_1fr_1fr_1.4fr] gap-3 px-4 text-xs font-medium text-muted-foreground md:grid">
              <span>Type</span>
              <span>Claim A</span>
              <span>Claim B</span>
              <span>Explanation</span>
            </div>
            {filtered.map((c, i) => (
              <div
                key={i}
                className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-[130px_1fr_1fr_1.4fr] md:items-start"
              >
                <TypeBadge type={c.type} />
                <div>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">{c.claimA.doc}</span> · p.{c.claimA.page}
                  </p>
                  <p className="mt-1 text-sm leading-5">{c.claimA.claim}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">{c.claimB.doc}</span> · p.{c.claimB.page}
                  </p>
                  <p className="mt-1 text-sm leading-5">{c.claimB.claim}</p>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">{c.explanation}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
