import fs from "node:fs";
import { supabaseAdmin } from "../lib/supabase";
import { chunkPages, extractDocDate } from "../lib/chunk";
import { embedTexts } from "../lib/gemini";

// Usage: DEMO_USER_ID=<uuid> npx tsx scripts/seed-demo.ts
async function main() {
  const userId = process.env.DEMO_USER_ID;
  if (!userId) throw new Error("Set DEMO_USER_ID env to a Supabase auth user id");
  const admin = supabaseAdmin();
  const { data: ws } = await admin.from("workspaces").insert({ user_id: userId, name: "Demo — policy conflicts" }).select("id").single();
  const wid = ws!.id as string;
  for (const f of ["demo/refund-policy-v1.md", "demo/refund-policy-v2.md", "demo/terms-of-service.md"]) {
    const text = fs.readFileSync(f, "utf-8");
    const { data: doc } = await admin.from("documents").insert({
      workspace_id: wid, user_id: userId, filename: f.split("/").pop(), file_type: "text/markdown",
      storage_path: `seed/${f}`, status: "processing",
    }).select("id").single();
    const chunks = chunkPages([{ page: 1, text }]);
    const embs = await embedTexts(chunks.map((c) => c.content));
    await admin.from("chunks").insert(chunks.map((c, i) => ({
      document_id: doc!.id, workspace_id: wid, user_id: userId, content: c.content,
      page_number: 1, section_title: c.section_title, chunk_index: i, embedding: `[${embs[i].join(",")}]`,
    })));
    await admin.from("documents").update({ status: "ready", doc_date: extractDocDate(text) }).eq("id", doc!.id);
    console.log("seeded", f);
  }
  console.log("workspace:", wid);
}
main();
