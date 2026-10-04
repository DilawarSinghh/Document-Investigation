"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

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
    if (error) {
      setMsg(error.message);
      setBusy(false);
    }
  };

  const emailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const sb = supabaseBrowser();
    const { error } =
      mode === "signin"
        ? await sb.auth.signInWithPassword({ email, password })
        : await sb.auth.signUp({ email, password });
    setBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    if (mode === "signup") setMsg("Account created! Check your email to confirm, then sign in.");
    else router.replace("/app");
  };

  const inputCls =
    "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <main className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <a href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back
      </a>

      <div className="mt-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Search className="h-4 w-4" />
        </span>
        <h1 className="text-xl font-semibold">Investigator</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Your documents stay private to your account.
      </p>

      <Button size="lg" onClick={google} disabled={busy} className="mt-8 w-full">
        Continue with Google
      </Button>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or with email
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={emailAuth} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={inputCls}
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (min 6 chars)"
          className={inputCls}
        />
        <Button type="submit" disabled={busy} className="w-full">
          {mode === "signin" ? "Sign in with email" : "Create account"}
        </Button>
      </form>

      <button
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="mt-4 text-sm text-primary hover:underline"
      >
        {mode === "signin" ? "New here? Create an account" : "Have an account? Sign in"}
      </button>
      {msg && (
        <p className="mt-4 rounded-lg border border-border bg-card p-3 text-sm text-foreground">{msg}</p>
      )}
    </main>
  );
}
