import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireUserId, requireOwnedWorkspace } from "@/lib/auth";
import { chunkPages, extractDocDate, sha256 } from "@/lib/chunk";
import { embedTexts, ocrImage, withBackoff } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED = ["application/pdf", "text/plain", "text/markdown", "image/png", "image/jpeg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
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
    const form = await req.formData();
    const workspace_id = String(form.get("workspace_id") ?? "");
    if (!workspace_id) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    // user_id always comes from the session — a spoofed client value could write into another user's data.
    const auth = await requireUserId();
    if ("response" in auth) return auth.response;
    const user_id = auth.userId;
    const files = form.getAll("files").filter(Boolean) as File[];
    if (!files.length) return NextResponse.json({ error: "No files" }, { status: 400 });
    const admin = supabaseAdmin();
    const denied = await requireOwnedWorkspace(admin, workspace_id, user_id);
    if (denied) return denied.response;
    const results: { filename: string; status: string; error?: string }[] = [];

    for (const f of files) {
      try {
        if (!ALLOWED.includes(f.type) && !/\.(txt|md|pdf|png|jpe?g|docx)$/i.test(f.name))
          throw new Error("Unsupported type");
        if (f.size > MAX) throw new Error("File exceeds 10 MB");
        const ab = await f.arrayBuffer();
        if (!ab.byteLength) throw new Error("Empty or corrupt file");
        const hash = await sha256(ab);
        const dup = await admin.from("documents").select("id").eq("workspace_id", workspace_id).eq("file_hash", hash).limit(1);
        if (dup.data?.length) { results.push({ filename: f.name, status: "ready", error: "duplicate skipped" }); continue; }

        const storage_path = `${user_id}/${workspace_id}/${Date.now()}-${f.name}`;
        const up = await admin.storage.from("documents").upload(storage_path, Buffer.from(ab), { contentType: f.type });
        if (up.error) throw new Error(up.error.message);
        const doc = await admin.from("documents").insert({
          workspace_id, user_id, filename: f.name, file_type: f.type || "unknown",
          storage_path, file_hash: hash, status: "processing",
        }).select("id").single();
        if (doc.error) throw new Error(doc.error.message);
        const docId = doc.data.id as string;

        // --- extract text per page ---
        let pages: { page: number; text: string }[] = [];
        if (f.type === "application/pdf" || f.name.endsWith(".pdf")) {
          pages = await extractPdfPages(ab);
          const empty = pages.every((p) => p.text.trim().length < 20);
          if (empty) {
            // scanned PDF: OCR first page image via Gemini (keep serverless-friendly: 1 call)
            const b64 = Buffer.from(ab.slice(0, 200000)).toString("base64");
            const ocr = await withBackoff(() => ocrImage(b64, "application/pdf").catch(() => ""));
            if (ocr) pages = [{ page: 1, text: ocr }];
          }
        } else if (f.type.startsWith("image/")) {
          const b64 = Buffer.from(ab).toString("base64");
          const ocr = await withBackoff(() => ocrImage(b64, f.type));
          pages = [{ page: 1, text: ocr }];
        } else if (f.name.endsWith(".docx")) {
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
          document_id: docId, workspace_id, user_id, content: c.content,
          page_number: c.page_number, section_title: c.section_title, chunk_index: i,
          embedding: `[${embeddings[i].join(",")}]`,
        }));
        // insert in batches
        for (let i = 0; i < rows.length; i += 50) {
          const { error } = await admin.from("chunks").insert(rows.slice(i, i + 50));
          if (error) throw new Error(error.message);
        }
        await admin.from("documents").update({
          status: "ready", page_count: pages.length, doc_date: extractDocDate(fullText),
        }).eq("id", docId);
        results.push({ filename: f.name, status: "ready" });
      } catch (e: unknown) {
        results.push({ filename: f.name, status: "failed", error: e instanceof Error ? e.message : "ingest failed" });
      }
    }
    return NextResponse.json({ results });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "ingest failed" }, { status: 500 });
  }
}
