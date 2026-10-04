import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  const ws = new URL(req.url).searchParams.get("workspace_id");
  const admin = supabaseAdmin();
  const { data } = await admin.from("documents").select("id,filename,status,page_count,doc_date").eq("workspace_id", ws ?? "").order("created_at");
  return NextResponse.json({ documents: data ?? [] });
}

export async function POST(req: Request) {
  const { workspace_id, user_id, name } = await req.json();
  const admin = supabaseAdmin();
  const { data, error } = await admin.from("workspaces").insert({ user_id, name: name ?? "Untitled" }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const conv = await admin.from("conversations").insert({ workspace_id: data.id, user_id, title: "New investigation" }).select("id").single();
  return NextResponse.json({ workspace_id: data.id, conversation_id: conv.data?.id });
}
