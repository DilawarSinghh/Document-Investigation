import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const store = cookies();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n: string) => store.get(n)?.value,
        set: (n: string, v: string, o: object) => { try { store.set(n, v, o as never); } catch {} },
        remove: (n: string) => { try { store.set(n, "", { maxAge: 0 } as never); } catch {} },
      },
    }
  );
  if (code) await sb.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL("/app", url.origin));
}
