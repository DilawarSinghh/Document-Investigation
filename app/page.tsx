"use client";
import { supabaseBrowser } from "@/lib/supabase";

export default function Landing() {
  const signIn = async () => {
    const sb = supabaseBrowser();
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-sm uppercase tracking-widest text-emerald-400">Hackathon ALG-AI-02</p>
      <h1 className="mt-2 text-5xl font-bold">Investigator</h1>
      <p className="mt-4 text-lg text-neutral-300">
        Upload documents. Ask natural-language questions. Get answers with exact citations,
        cross-document conflict detection, and honest uncertainty.
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-3 text-sm">
        {["Exact source citations", "Conflict detection", "Admits uncertainty"].map((f) => (
          <li key={f} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">{f}</li>
        ))}
      </ul>
      <div className="mt-8 flex gap-3">
        <button onClick={signIn} className="rounded-lg bg-white px-5 py-3 font-medium text-black hover:bg-neutral-200">
          Continue with Google
        </button>
        <a href="/login" className="rounded-lg border border-neutral-600 px-5 py-3 hover:bg-neutral-900">Sign in</a>
        <a href="/demo" className="rounded-lg border border-neutral-700 px-5 py-3 hover:bg-neutral-900">View demo seed</a>
      </div>
    </main>
  );
}
