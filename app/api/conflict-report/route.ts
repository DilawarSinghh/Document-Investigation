import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { extractClaims, compareClaims } from "@/lib/groq";
import type { ChunkRow } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// Scans whole workspace: sample chunks per doc, extract + compare → list conflicts
export async function POST(req: Request) {
  try {
    const { workspace_id } = await req.json();
    if (!workspace_id) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    const admin = supabaseAdmin();
    const { data: chunks } = await admin.from("chunks").select("content,page_number,section_title,document_id,documents!inner(filename,doc_date)")
      .eq("workspace_id", workspace_id).limit(60);
    type Row = { content: string; page_number: number; section_title: string | null; document_id: string; documents: { filename: string } | { filename: string }[] };
    const rows: ChunkRow[] = ((chunks ?? []) as unknown as Row[]).map((cc, i) => {
      const doc = Array.isArray(cc.documents) ? cc.documents[0] : cc.documents;
      return { id: `scan-${i}`, content: cc.content, page_number: cc.page_number, section_title: cc.section_title, document_id: cc.document_id, filename: doc?.filename ?? "unknown", doc_date: null, combined: 1, chunk_index: 0 };
    });
    if (!rows.length) return NextResponse.json({ conflicts: [] });
    const claims = await extractClaims("List all factual claims that could conflict across documents (dates, numbers, policies, versions).", rows);
    const pairs = await compareClaims("workspace scan", claims);
    const conflicts = pairs.filter((p) => p.label === "conflict").map((p) => ({
      claimA: claims[p.a], claimB: claims[p.b], type: p.type, explanation: p.explanation, suggested_resolution: p.suggested_resolution,
    }));
    return NextResponse.json({ conflicts });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "scan failed" }, { status: 500 });
  }
}
