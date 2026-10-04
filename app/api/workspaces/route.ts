import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireUserId, requireOwnedWorkspace } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const url = new URL(req.url);
  const ws = url.searchParams.get("workspace_id");
  const admin = supabaseAdmin();

  if (ws) {
    const denied = await requireOwnedWorkspace(admin, ws, auth.userId);
    if (denied) return denied.response;
    const { data } = await admin.from("documents").select("id,filename,status,page_count,doc_date")
      .eq("workspace_id", ws).eq("user_id", auth.userId).order("created_at");
    return NextResponse.json({ documents: data ?? [] });
  }

  const { data } = await admin.from("workspaces").select("id,name").eq("user_id", auth.userId).order("created_at");
  return NextResponse.json({ workspaces: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const { name } = await req.json();
  const admin = supabaseAdmin();
  // user_id always comes from the session — never trust the client.
  const { data, error } = await admin.from("workspaces").insert({ user_id: auth.userId, name: name ?? "Untitled" }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const conv = await admin.from("conversations").insert({ workspace_id: data.id, user_id: auth.userId, title: "New investigation" }).select("id").single();
  return NextResponse.json({ workspace_id: data.id, conversation_id: conv.data?.id });
}
