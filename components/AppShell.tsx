"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/store/useStore";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Chat } from "./Chat";
import { SourceViewer } from "./SourceViewer";
import { ConflictReport } from "./ConflictReport";
import { CommandPalette } from "./CommandPalette";
import { MobileNav } from "./MobileNav";
import { cn } from "@/lib/utils";

export function AppShell() {
  const { workspaceId, docs, set, sidebarCollapsed, tab } = useStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pollingRef = useRef(false);

  const refreshDocs = useCallback(async () => {
    const ws = useStore.getState().workspaceId;
    if (!ws || pollingRef.current) return;
    pollingRef.current = true;
    try {
      const res = await fetch(`/api/workspaces?workspace_id=${ws}`);
      const j = await res.json();
      if (res.ok) set({ docs: j.documents ?? [] });
    } catch {
      /* transient — next poll retries */
    } finally {
      pollingRef.current = false;
    }
  }, [set]);

  useEffect(() => {
    (async () => {
      const sb = supabaseBrowser();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) return;

      try {
        const res = await fetch("/api/workspaces");
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "Could not load workspaces");
        const list = j.workspaces ?? [];
        if (!list.length) {
          const created = await fetch("/api/workspaces", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "My investigation" }),
          });
          const cj = await created.json();
          if (!created.ok) throw new Error(cj.error || "Could not create workspace");
          set({
            workspaces: [{ id: cj.workspace_id, name: "My investigation" }],
            workspaceId: cj.workspace_id,
            workspaceName: "My investigation",
          });
          localStorage.setItem("ws", cj.workspace_id);
        } else {
          const saved = localStorage.getItem("ws");
          const current = list.find((w: { id: string }) => w.id === saved) ?? list[0];
          set({ workspaces: list, workspaceId: current.id, workspaceName: current.name });
        }
        await refreshDocs();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load workspace");
      } finally {
        setLoading(false);
      }
    })();
  }, [set, refreshDocs]);

  // Keep document statuses fresh while indexing is in flight.
  useEffect(() => {
    if (!workspaceId) return;
    const active = docs.some((d) => d.status === "processing");
    if (!active) return;
    const t = setInterval(refreshDocs, 3000);
    return () => clearInterval(t);
  }, [workspaceId, docs, refreshDocs]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" aria-label="Loading workspace">
        <div className="space-y-3">
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          <div className="h-3 w-56 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-foreground">We could not load your workspace.</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary/90"
        >
          Reload
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />
      <div className="flex min-h-0 flex-1">
        <div className={cn(sidebarCollapsed && "hidden md:hidden")}>
          <Sidebar workspaceId={workspaceId} docs={docs} onDocsChange={refreshDocs} />
        </div>
        <main className="min-w-0 flex-1 overflow-hidden pb-14 md:pb-0">
          {tab === "chat" ? <Chat /> : <ConflictReport docs={docs} />}
        </main>
        <SourceViewer />
      </div>
      <MobileNav />
      <CommandPalette />
    </div>
  );
}
