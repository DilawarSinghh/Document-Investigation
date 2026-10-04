"use client";

import { FileText, FolderOpen } from "lucide-react";
import { useStore, type DocItem } from "@/store/useStore";
import { UploadZone } from "@/components/UploadZone";
import { cn } from "@/lib/utils";

const dot: Record<string, string> = {
  ready: "bg-success",
  failed: "bg-destructive",
  processing: "bg-primary",
};

function statusLabel(status: string) {
  if (status === "ready") return "Ready";
  if (status === "failed") return "Failed";
  return "Indexing";
}

export function Sidebar({
  workspaceId,
  docs,
  onDocsChange,
}: {
  workspaceId: string | null;
  docs: DocItem[];
  onDocsChange: () => void;
}) {
  const { sidebarOpen, set } = useStore();

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm md:hidden"
          onClick={() => set({ sidebarOpen: false })}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-border bg-card transition-transform duration-200 md:static md:z-auto md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Documents"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <FolderOpen className="h-3.5 w-3.5" />
            Documents
          </span>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground md:hidden"
            onClick={() => set({ sidebarOpen: false })}
          >
            Close
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-3">
          <UploadZone workspaceId={workspaceId} onDocsChange={onDocsChange} />
          <ul className="space-y-1" aria-label="Document list">
            {docs.map((d) => (
              <li
                key={d.id}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors duration-150 hover:bg-accent"
              >
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot[d.status] ?? "bg-muted-foreground")} />
                <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{d.filename}</span>
                <span className="text-[11px] text-muted-foreground">{statusLabel(d.status)}</span>
              </li>
            ))}
            {!docs.length && (
              <li className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                No documents yet. Upload a file to get started.
              </li>
            )}
          </ul>
        </div>
      </aside>
    </>
  );
}
