"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // Already logged in → go straight to the app
  useEffect(() => {
    supabaseBrowser().auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/app");
    });
  }, [router]);

  const google = async () => {
    setBusy(true);
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setMsg(error.message); setBusy(false); }
  };

  const emailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg("");
    const sb = supabaseBrowser();
    const { error } =
      mode === "signin"
        ? await sb.auth.signInWithPassword({ email, password })
        : await sb.auth.signUp({ email, password });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    if (mode === "signup") setMsg("Account created! Check your email to confirm, then sign in.");
    else router.replace("/app");
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <a href="/" className="text-sm text-neutral-500 hover:text-neutral-200">← Back</a>
      <h1 className="mt-2 text-3xl font-bold">Sign in to Investigator</h1>
      <p className="mt-1 text-sm text-neutral-400">Your documents stay private to your account (RLS-protected).</p>

      <button onClick={google} disabled={busy}
        className="mt-6 rounded-lg bg-white px-5 py-3 font-medium text-black hover:bg-neutral-200 disabled:opacity-50">
        Continue with Google
      </button>

      <div className="my-4 flex items-center gap-2 text-xs text-neutral-500">
        <span className="h-px flex-1 bg-neutral-800" /> or with email <span className="h-px flex-1 bg-neutral-800" />
      </div>

      <form onSubmit={emailAuth} className="space-y-3">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" />
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 6 chars)"
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" />
        <button disabled={busy} className="w-full rounded-lg border border-neutral-600 px-5 py-2 text-sm hover:bg-neutral-800 disabled:opacity-50">
          {mode === "signin" ? "Sign in with email" : "Create account"}
        </button>
      </form>

      <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="mt-3 text-sm text-emerald-400 hover:underline">
        {mode === "signin" ? "New here? Create an account" : "Have an account? Sign in"}
      </button>
      {msg && <p className="mt-3 rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-sm text-neutral-300">{msg}</p>}
    </main>
  );
}
