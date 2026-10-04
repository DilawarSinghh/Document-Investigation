import { createClient } from "@supabase/supabase-js";

// Server-only. Bypasses RLS — every caller must verify workspace ownership
// via requireOwnedWorkspace (lib/auth.ts) before touching user data.
export const supabaseAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
