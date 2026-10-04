"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ClipboardPaste,
  FileText,
  Loader2,
  RotateCcw,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.txt,.md,.docx";
const EXTS = ["pdf", "png", "jpg", "jpeg", "txt", "md", "docx"];
const MAX = 10 * 1024 * 1024;

type Status = "queued" | "uploading" | "extracting" | "indexing" | "ready" | "failed";

type UploadItem = {
  id: string;
  file: File;
  name: string;
  size: number;
  progress: number;
  status: Status;
  error?: string;
};

const STATUS_CHIP: Record<Status, { label: string; className: string }> = {
  queued: { label: "Queued", className: "bg-muted text-muted-foreground" },
  uploading: { label: "Uploading", className: "bg-primary/10 text-primary" },
  extracting: { label: "Extracting", className: "bg-primary/10 text-primary" },
  indexing: { label: "Indexing", className: "bg-primary/10 text-primary" },
  ready: { label: "Ready", className: "bg-success/10 text-success" },
  failed: { label: "Failed", className: "bg-destructive/10 text-destructive" },
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function uploadToStorage(
  file: File,
  path: string,
  token: string,
  onProgress: (pct: number) => void
): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/documents/${path}`;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let msg = `Upload failed (${xhr.status})`;
      try {
        const j = JSON.parse(xhr.responseText);
        msg = j.message || j.error || msg;
      } catch {
        /* keep default */
      }
      reject(new Error(msg));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}

export function UploadZone({
  workspaceId,
  onDocsChange,
}: {
  workspaceId: string | null;
  onDocsChange: () => void;
}) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteName, setPasteName] = useState("");
  const [pasteText, setPasteText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const itemsRef = useRef<UploadItem[]>([]);
  itemsRef.current = items;

  // Command palette "Upload files" action reaches us via this event.
  useEffect(() => {
    const open = () => inputRef.current?.click();
    window.addEventListener("investigator:upload", open);
    return () => window.removeEventListener("investigator:upload", open);
  }, []);

  const update = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, []);

  const pollUntilDone = useCallback(
    async (id: string, filename: string) => {
      for (let i = 0; i < 28; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const res = await fetch(`/api/workspaces?workspace_id=${workspaceId}`);
          const j = await res.json();
          const doc = (j.documents ?? []).find((d: { filename: string }) => d.filename === filename);
          if (doc?.status === "ready") {
            update(id, { status: "ready", progress: 100 });
            onDocsChange();
            return;
          }
          if (doc?.status === "failed") {
            update(id, { status: "failed", error: doc.error || "Indexing failed" });
            onDocsChange();
            return;
          }
        } catch {
          /* keep polling */
        }
      }
      update(id, { status: "failed", error: "Timed out waiting for indexing" });
    },
    [workspaceId, update, onDocsChange]
  );

  const process = useCallback(
    async (id: string) => {
      const item = itemsRef.current.find((i) => i.id === id);
      if (!item || !workspaceId) return;
      try {
        update(id, { status: "uploading" });
        const sb = supabaseBrowser();
        const {
          data: { session },
        } = await sb.auth.getSession();
        if (!session) throw new Error("Not signed in — refresh and try again");
        const path = `${session.user.id}/${workspaceId}/${Date.now()}-${item.name}`;
        await uploadToStorage(item.file, path, session.access_token, (p) => update(id, { progress: p }));
        update(id, { status: "extracting" });
        const res = await fetch("/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspace_id: workspaceId,
            files: [
              {
                storage_path: path,
                filename: item.name,
                file_type: item.file.type,
                size: item.file.size,
              },
            ],
          }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "Processing failed");
        const r0 = j.results?.[0];
        if (r0?.status === "failed") throw new Error(r0.error || "Processing failed");
        update(id, { status: "indexing" });
        onDocsChange();
        await pollUntilDone(id, item.name);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Upload failed";
        console.error("[upload]", msg);
        update(id, { status: "failed", error: msg });
        toast.error(`Failed: ${item.name}`, { description: msg });
      }
    },
    [workspaceId, update, onDocsChange, pollUntilDone]
  );

  const enqueue = useCallback(
    (files: File[]) => {
      if (!workspaceId) {
        toast.error("No workspace selected");
        return;
      }
      const valid: UploadItem[] = [];
      for (const f of files) {
        const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
        if (!EXTS.includes(ext)) {
          toast.error(`Unsupported file type: ${f.name}`, { description: `Allowed: ${ACCEPT}` });
          continue;
        }
        if (f.size > MAX) {
          toast.error(`File too large: ${f.name}`, { description: "Maximum size is 10 MB per file." });
          continue;
        }
        valid.push({ id: crypto.randomUUID(), file: f, name: f.name, size: f.size, progress: 0, status: "queued" });
      }
      if (!valid.length) return;
      setItems((prev) => [...prev, ...valid]);
      for (const item of valid) {
        queueRef.current = queueRef.current.then(() => process(item.id));
      }
    },
    [workspaceId, process]
  );

  const retry = (id: string) => {
    update(id, { status: "queued", progress: 0, error: undefined });
    queueRef.current = queueRef.current.then(() => process(id));
  };

  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const addPaste = () => {
    const text = pasteText.trim();
    if (!text) {
      toast.error("Nothing to upload", { description: "Paste some text first." });
      return;
    }
    const name = pasteName.trim() || `pasted-text-${new Date().toISOString().slice(0, 10)}.txt`;
    const file = new File([text], name.endsWith(".txt") ? name : `${name}.txt`, { type: "text/plain" });
    setPasteText("");
    setPasteName("");
    setPasteOpen(false);
    enqueue([file]);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    enqueue(Array.from(e.dataTransfer.files));
  };

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload files"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-8 text-center transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-primary/50 hover:bg-accent/50"
        )}
      >
        <Upload className={cn("h-5 w-5", dragging ? "text-primary" : "text-muted-foreground")} />
        <p className="mt-2 text-sm font-medium">
          {dragging ? "Drop files to upload" : "Drop files here, or click to browse"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          PDF, PNG, JPG, TXT, MD, DOCX · max 10 MB each
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => {
            enqueue(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>

      <button
        type="button"
        onClick={() => setPasteOpen((v) => !v)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ClipboardPaste className="h-3.5 w-3.5" />
        Paste text as a document
      </button>

      {pasteOpen && (
        <div className="space-y-2 rounded-lg border border-border bg-card p-3">
          <input
            value={pasteName}
            onChange={(e) => setPasteName(e.target.value)}
            placeholder="Name (optional) — defaults to pasted-text.txt"
            className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste the text content of your document here…"
            rows={5}
            className="w-full resize-y rounded-md border border-input bg-background px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="button"
            onClick={addPaste}
            className="w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Add as document
          </button>
        </div>
      )}

      {items.length > 0 && (
        <ul className="space-y-2" aria-label="Upload queue">
          {items.map((item) => {
            const chip = STATUS_CHIP[item.status];
            return (
              <li key={item.id} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-2">
                  {item.status === "ready" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  ) : item.status === "failed" ? (
                    <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                  ) : (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                  )}
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">{item.name}</span>
                  <span className="text-xs text-muted-foreground">{formatSize(item.size)}</span>
                  <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-medium", chip.className)}>
                    {chip.label}
                  </span>
                  {item.status === "failed" && (
                    <button
                      type="button"
                      onClick={() => retry(item.id)}
                      aria-label={`Retry ${item.name}`}
                      title="Retry"
                      className="rounded-md p-1 text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    aria-label={`Remove ${item.name}`}
                    title="Remove"
                    className="rounded-md p-1 text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {(item.status === "uploading" || item.status === "queued") && (
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-200"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
                {item.status === "failed" && item.error && (
                  <p className="mt-2 text-xs text-destructive">{item.error}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
