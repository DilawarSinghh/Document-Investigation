import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseServer } from "./supabase-server";

// Returns the authenticated user id from the session cookie, or a 401 response.
export async function requireUserId(): Promise<{ userId: string } | { response: NextResponse }> {
  const sb = supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) return { response: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  return { userId: data.user.id };
}

// Verifies the workspace belongs to the user. Returns 403/404 responses otherwise.
export async function requireOwnedWorkspace(
  admin: SupabaseClient, workspace_id: string, userId: string
): Promise<{ response: NextResponse } | null> {
  const { data, error } = await admin.from("workspaces").select("id").eq("id", workspace_id).eq("user_id", userId).single();
  if (error || !data) return { response: NextResponse.json({ error: "Workspace not found or access denied" }, { status: 403 }) };
  return null;
}
