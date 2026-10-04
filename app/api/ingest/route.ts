import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireUserId, requireOwnedWorkspace } from "@/lib/auth";
import { chunkPages, extractDocDate, sha256 } from "@/lib/chunk";
import { embedTexts, ocrImage, withBackoff } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

// Validation is by extension — browsers often send empty MIME types for .md/.docx.
const EXTS = ["pdf", "png", "jpg", "jpeg", "txt", "md", "docx"];
const MAX = 10 * 1024 * 1024;

async function extractPdfPages(buf: ArrayBuffer): Promise<{ page: number; text: string }[]> {
  const { extractText } = await import("unpdf");
  const { text } = await extractText(new Uint8Array(buf));
  const pages: { page: number; text: string }[] = [];
  if (Array.isArray(text)) text.forEach((t, i) => pages.push({ page: i + 1, text: String(t ?? "") }));
  else pages.push({ page: 1, text: String(text ?? "") });
  return pages;
}

export async function POST(req: Request) {
  try {
    const { workspace_id, files } = await req.json();
    if (!workspace_id || !Array.isArray(files) || !files.length)
      return NextResponse.json({ error: "workspace_id and files required" }, { status: 400 });
    const auth = await requireUserId();
    if ("response" in auth) return auth.response;
    const admin = supabaseAdmin();
    const denied = await requireOwnedWorkspace(admin, workspace_id, auth.userId);
    if (denied) return denied.response;

    const results: { filename: string; status: string; error?: string }[] = [];

    for (const f of files) {
      try {
        const filename = String(f.filename ?? "");
        const ext = filename.split(".").pop()?.toLowerCase() ?? "";
        if (!EXTS.includes(ext)) throw new Error("Unsupported type");
        if (Number(f.size) > MAX) throw new Error("File exceeds 10 MB");
        // The client only ever passes paths under its own user_id/workspace_id — enforce it.
        const storage_path = String(f.storage_path ?? "");
        if (!storage_path.startsWith(`${auth.userId}/${workspace_id}/`))
          throw new Error("Invalid storage path");

        const { data: blob, error: dlErr } = await admin.storage.from("documents").download(storage_path);
        if (dlErr) throw new Error(`Could not read uploaded file: ${dlErr.message}`);
        const ab = await blob.arrayBuffer();
        if (!ab.byteLength) throw new Error("Empty or corrupt file");
        const hash = await sha256(ab);

        const dup = await admin.from("documents").select("id").eq("workspace_id", workspace_id).eq("file_hash", hash).limit(1);
        if (dup.data?.length) {
          results.push({ filename, status: "ready", error: "duplicate skipped" });
          continue;
        }

        const doc = await admin.from("documents").insert({
          workspace_id, user_id: auth.userId, filename, file_type: ext,
          storage_path, file_hash: hash, status: "processing",
        }).select("id").single();
        if (doc.error) throw new Error(doc.error.message);
        const docId = doc.data.id as string;

        let pages: { page: number; text: string }[] = [];
        if (ext === "pdf") {
          pages = await extractPdfPages(ab);
          const empty = pages.every((p) => p.text.trim().length < 20);
          if (empty) {
            const b64 = Buffer.from(ab.slice(0, 200000)).toString("base64");
            const ocr = await withBackoff(() => ocrImage(b64, "application/pdf").catch(() => ""));
            if (ocr) pages = [{ page: 1, text: ocr }];
          }
        } else if (ext === "png" || ext === "jpg" || ext === "jpeg") {
          const b64 = Buffer.from(ab).toString("base64");
          const ocr = await withBackoff(() => ocrImage(b64, `image/${ext === "jpg" ? "jpeg" : ext}`));
          pages = [{ page: 1, text: ocr }];
        } else if (ext === "docx") {
          const mammoth = await import("mammoth");
          const { value } = await mammoth.extractRawText({ buffer: Buffer.from(ab) });
          pages = [{ page: 1, text: value }];
        } else {
          pages = [{ page: 1, text: Buffer.from(ab).toString("utf-8") }];
        }
        const fullText = pages.map((p) => p.text).join("\n").slice(0, 20000);
        if (!fullText.trim()) throw new Error("No extractable text (corrupt or blank)");

        const chunks = chunkPages(pages);
        const embeddings = await withBackoff(() => embedTexts(chunks.map((c) => c.content)));
        const rows = chunks.map((c, i) => ({
          document_id: docId, workspace_id, user_id: auth.userId, content: c.content,
          page_number: c.page_number, section_title: c.section_title, chunk_index: i,
          embedding: `[${embeddings[i].join(",")}]`,
        }));
        for (let i = 0; i < rows.length; i += 50) {
          const { error } = await admin.from("chunks").insert(rows.slice(i, i + 50));
          if (error) throw new Error(error.message);
        }
        await admin.from("documents").update({
          status: "ready", page_count: pages.length, doc_date: extractDocDate(fullText),
        }).eq("id", docId);
        results.push({ filename, status: "ready" });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "ingest failed";
        console.error("[ingest]", msg);
        results.push({ filename: String(f.filename ?? "file"), status: "failed", error: msg });
      }
    }
    return NextResponse.json({ results });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "ingest failed" }, { status: 500 });
  }
}
