import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-only (Server Components, Route Handlers). Reads the session cookie.
export const supabaseServer = () => {
  const store = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => store.get(n)?.value, set() {}, remove() {} } }
  );
};
