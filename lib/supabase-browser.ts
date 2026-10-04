import { createBrowserClient } from "@supabase/ssr";

// Client-side only. Never import next/headers here — this module ships to the browser.
export const supabaseBrowser = () =>
  createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
