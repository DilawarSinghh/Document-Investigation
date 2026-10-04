import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireUserId, requireOwnedWorkspace } from "@/lib/auth";
import { embedTexts, withBackoff } from "@/lib/gemini";
import { extractClaims, compareClaims, synthesize } from "@/lib/groq";
import type { ChunkRow } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { workspace_id, question, conversation_id } = await req.json();
    if (!workspace_id || !question?.trim()) return NextResponse.json({ error: "workspace_id and question required" }, { status: 400 });
    const auth = await requireUserId();
    if ("response" in auth) return auth.response;
    const admin = supabaseAdmin();
    // Ownership gate: the service key bypasses RLS, so verify the workspace belongs to the caller.
    const denied = await requireOwnedWorkspace(admin, workspace_id, auth.userId);
    if (denied) return denied.response;

    const ready = await admin.from("documents").select("id").eq("workspace_id", workspace_id).eq("user_id", auth.userId).eq("status", "ready").limit(1);
    if (!ready.data?.length)
      return NextResponse.json({ verdict: "insufficient_evidence", answer: "No documents are ready yet. Upload files and wait for indexing to finish.", confidence: 0, citations: [], conflicts: [], uncertainty_note: "No indexed documents in this workspace." });

    const [qEmb] = await withBackoff(() => embedTexts([question]));
    const { data: chunks, error } = await admin.rpc("match_chunks", {
      query_embedding: `[${qEmb.join(",")}]`, p_workspace_id: workspace_id, p_k: 10, p_query_text: question,
    });
    if (error) throw new Error(error.message);
    const top = ((chunks ?? []) as ChunkRow[]).slice(0, 10);
    if (!top.length)
      return NextResponse.json({ verdict: "insufficient_evidence", answer: "I found no relevant passages in your documents for this question.", confidence: 0, citations: [], conflicts: [], uncertainty_note: "Zero search results. Try rephrasing or uploading more documents." });

    const claims = await extractClaims(question, top);
    // server-side quote validation: keep only quotes that exist verbatim in chunk text
    const corpus = top.map((c) => c.content).join("\n");
    const norm = (s: string) => s.replace(/\s+/g, " ").trim();
    const validClaims = claims.filter((c) => c.quote && norm(corpus).includes(norm(c.quote).slice(0, 60))).slice(0, 20);

    const pairs = await compareClaims(question, validClaims);
    const conflictsOnly = pairs.filter((p) => p.label === "conflict");
    const ans = await synthesize(question, top, validClaims, conflictsOnly);

    // map citations to real doc_ids (model may hallucinate ids)
    const byName = new Map(top.map((c) => [c.filename, c]));
    ans.citations = ans.citations.map((ct) => {
      const hit = byName.get(ct.filename) ?? top[0];
      const quoteOk = ct.quote && norm(corpus).includes(norm(ct.quote).slice(0, 60));
      return { doc_id: hit.document_id, filename: hit.filename, page: hit.page_number, section: ct.section ?? hit.section_title, quote: quoteOk ? ct.quote : hit.content.slice(0, 300) };
    }).slice(0, 8);

    // force conflicting verdict if conflicts found but model said confident
    if (conflictsOnly.length && ans.verdict === "confident") ans.verdict = "conflicting";
    if (!ans.citations.length) { ans.verdict = "insufficient_evidence"; ans.uncertainty_note = "Retrieved evidence was too weak to cite. " + ans.uncertainty_note; }

    if (conversation_id) {
      // Only persist to a conversation the caller owns in this workspace.
      const conv = await admin.from("conversations").select("user_id").eq("id", conversation_id).eq("workspace_id", workspace_id).eq("user_id", auth.userId).single();
      if (conv.data) {
        await admin.from("messages").insert([
          { conversation_id, user_id: auth.userId, role: "user", content: question },
          { conversation_id, user_id: auth.userId, role: "assistant", content: ans.answer, citations: ans.citations, verdict: ans.verdict, conflicts: ans.conflicts, confidence: ans.confidence, uncertainty_note: ans.uncertainty_note },
        ]);
      }
    }
    return NextResponse.json(ans);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "ask failed";
    const rate = /429|rate|quota/i.test(msg);
    return NextResponse.json({ error: rate ? "AI rate limit hit. Please wait and retry." : msg }, { status: rate ? 429 : 500 });
  }
}
