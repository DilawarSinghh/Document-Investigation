"use client";

import { useEffect, useState } from "react";
import { FileText, X } from "lucide-react";
import { useStore } from "@/store/useStore";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

export function SourceViewer() {
  const { source, set, sourcesOpen } = useStore();
  const [text, setText] = useState("");
  const [filename, setFilename] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const sb = supabaseBrowser();
        const { data: doc } = await sb.from("documents").select("filename").eq("id", source.docId).single();
        const { data } = await sb
          .from("chunks")
          .select("content,page_number")
          .eq("document_id", source.docId)
          .order("chunk_index")
          .limit(20);
        if (cancelled) return;
        setFilename(doc?.filename ?? "Document");
        setText(
          (data ?? [])
            .map((c: { page_number: number; content: string }) => `[p.${c.page_number}]\n${c.content}`)
            .join("\n\n")
        );
      } catch (e) {
        console.error("[source]", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source]);

  return (
    <>
      {sourcesOpen && source && (
        <div
          className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm md:hidden"
          onClick={() => set({ sourcesOpen: false })}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-40 flex w-80 shrink-0 flex-col border-l border-border bg-card transition-transform duration-200 md:static md:z-auto md:translate-x-0",
          sourcesOpen && source ? "translate-x-0" : "translate-x-full md:hidden"
        )}
        aria-label="Source viewer"
      >
        {source && (
          <>
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground">
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate font-mono">{filename}</span>
                <span>· p.{source.page}</span>
              </span>
              <button
                type="button"
                aria-label="Close source viewer"
                onClick={() => set({ source: null, sourcesOpen: false })}
                className="rounded-md p-1 text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="space-y-2" aria-label="Loading source">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-full animate-pulse rounded bg-muted" />
                  <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-full animate-pulse rounded bg-muted" />
                </div>
              ) : (
                <SourceText text={text} quote={source.quote} />
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function SourceText({ text, quote }: { text: string; quote: string }) {
  const needle = quote?.slice(0, 60) ?? "";
  const idx = needle ? text.indexOf(needle) : -1;
  if (idx < 0) {
    return <p className="whitespace-pre-wrap font-mono text-xs leading-6 text-muted-foreground">{text}</p>;
  }
  const before = text.slice(Math.max(0, idx - 400), idx);
  const hit = text.slice(idx, idx + 500);
  const after = text.slice(idx + 500, idx + 1000);
  return (
    <p className="whitespace-pre-wrap font-mono text-xs leading-6 text-muted-foreground">
      {before}
      <mark className="rounded-sm bg-warning/20 px-0.5 text-foreground">{hit}</mark>
      {after}
    </p>
  );
}
