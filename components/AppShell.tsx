"use client";
import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Chat } from "./Chat";
import { SourceViewer } from "./SourceViewer";
import { ConflictReport } from "./ConflictReport";

export function AppShell() {
  const { workspaceId, set, tab } = useStore();
  const [docs, setDocs] = useState<{ id: string; filename: string; status: string }[]>([]);
  const [uploading, setUploading] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const sb = supabaseBrowser();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      let ws = localStorage.getItem("ws");
      if (!ws) {
        const r = await fetch("/api/workspaces", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: user.id, name: "My investigation" }) });
        ws = (await r.json()).workspace_id;
        localStorage.setItem("ws", ws!);
      }
      set({ workspaceId: ws });
      const d = await fetch(`/api/workspaces?workspace_id=${ws}`).then((r) => r.json());
      setDocs(d.documents ?? []);
    })();
  }, [set]);

  const upload = async (files: FileList | null) => {
    if (!files?.length || !workspaceId) return;
    const sb = supabaseBrowser();
    const { data: { user } } = await sb.auth.getUser();
    setUploading(Array.from(files).map((f) => f.name));
    const form = new FormData();
    form.append("workspace_id", workspaceId);
    form.append("user_id", user!.id);
    Array.from(files).forEach((f) => form.append("files", f));
    try {
      const r = await fetch("/api/ingest", { method: "POST", body: form });
      const j = await r.json();
      alert(JSON.stringify(j.results ?? j, null, 2));
      const d = await fetch(`/api/workspaces?workspace_id=${workspaceId}`).then((r) => r.json());
      setDocs(d.documents ?? []);
    } finally { setUploading([]); }
  };

  return (
    <div className="flex h-screen flex-col md:flex-row">
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-neutral-800 bg-neutral-900 p-4">
        <h2 className="font-bold">Investigator</h2>
        <label className="mt-3 block cursor-pointer rounded-lg border border-dashed border-neutral-700 p-4 text-center text-sm hover:bg-neutral-800">
          Drop files / click to upload (PDF, PNG/JPG, TXT, MD, DOCX · 10MB)
          <input type="file" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
        </label>
        {uploading.map((n) => <p key={n} className="mt-1 animate-pulse text-xs text-neutral-400">{n} — uploading…</p>)}
        <ul className="mt-3 space-y-1 text-sm">
          {docs.map((d) => (
            <li key={d.id} className="flex justify-between rounded bg-neutral-800 px-2 py-1">
              <span className="truncate">{d.filename}</span>
              <span className={d.status === "ready" ? "text-emerald-400" : d.status === "failed" ? "text-red-400" : "text-amber-400"}>{d.status}</span>
            </li>
          ))}
          {!docs.length && <li className="text-neutral-500">No documents yet.</li>}
        </ul>
        <div className="mt-4 flex gap-2 text-sm">
          <button onClick={() => set({ tab: "chat" })} className={`rounded px-3 py-1 ${tab === "chat" ? "bg-white text-black" : "border border-neutral-700"}`}>Chat</button>
          <button onClick={() => set({ tab: "conflicts" })} className={`rounded px-3 py-1 ${tab === "conflicts" ? "bg-white text-black" : "border border-neutral-700"}`}>Conflict Report</button>
        </div>
        <button
          onClick={async () => { await supabaseBrowser().auth.signOut(); window.location.href = "/"; }}
          className="mt-2 w-full rounded px-3 py-1 text-left text-sm text-neutral-500 hover:text-neutral-200">
          Sign out
        </button>
      </aside>
      <main className="flex-1 overflow-y-auto p-4">{tab === "chat" ? <Chat /> : <ConflictReport docs={docs} />}</main>
      <SourceViewer />
    </div>
  );
}
