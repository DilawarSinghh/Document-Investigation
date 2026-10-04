"use client";
import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { supabaseBrowser } from "@/lib/supabase-browser";

export function SourceViewer() {
  const { source, set } = useStore();
  const [text, setText] = useState("");
  useEffect(() => {
    if (!source) return;
    (async () => {
      const sb = supabaseBrowser();
      const { data } = await sb.from("chunks").select("content,page_number").eq("document_id", source.docId).order("chunk_index").limit(20);
      setText((data ?? []).map((c: { page_number: number; content: string }) => `[p.${c.page_number}] ${c.content}`).join("\n\n"));
    })();
  }, [source]);
  if (!source) return <div className="hidden md:block md:w-72 border-l border-neutral-800 p-4 text-sm text-neutral-500">Click a citation to view the source.</div>;
  const idx = source.quote ? text.indexOf(source.quote.slice(0, 60)) : -1;
  const before = idx >= 0 ? text.slice(Math.max(0, idx - 500), idx) : text.slice(0, 1000);
  const hit = idx >= 0 ? text.slice(idx, idx + 600) : "";
  const after = idx >= 0 ? text.slice(idx + 600, idx + 1200) : text.slice(1000, 2000);
  return (
    <aside className="w-full md:w-80 border-t md:border-t-0 md:border-l border-neutral-800 bg-neutral-900 p-4 text-sm">
      <div className="flex justify-between"><b>Source · p.{source.page}</b><button onClick={() => set({ source: null })}>✕</button></div>
      <p className="mt-2 whitespace-pre-wrap text-neutral-300">{before}<mark className="bg-yellow-300 text-black">{hit}</mark>{after}</p>
    </aside>
  );
}
